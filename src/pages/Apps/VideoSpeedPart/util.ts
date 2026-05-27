import {
    ffmpegConcatVideos,
    ffmpegCutVideo,
    ffmpegOptimized,
} from "../../../lib/ffmpeg";
import { ffprobeGetMediaDuration } from "../../../lib/ffprobe";

export type VideoSpeedPartOption = {
    video: string;
    times: {
        startMs: number;
        endMs: number;
    }[];
    width: number;
    height: number;
    fps: number;
    speed: number;
};

// FFmpeg 工具函数：改变视频播放速度
async function ffmpegChangeSpeed(
    input: string,
    speed: number,
    speedUpGif: string,
    option: VideoSpeedPartOption,
): Promise<string> {
    const output = await $mapi.file.temp("mp4");

    // 获取输入视频时长
    const inputDuration = await ffprobeGetMediaDuration(input, false);
    const outputDuration = inputDuration / speed;

    console.log("ffmpegChangeSpeed Change speed:", {
        inputDuration,
        outputDuration,
        speed,
    });

    // 构建 atempo 滤镜链（FFmpeg atempo 只支持 0.5-2.0，超出范围需要链式处理）
    const buildAtempoFilter = (ratio: number): string => {
        const filters: string[] = [];
        let remain = ratio;
        while (remain > 2.0) {
            filters.push("atempo=2.0");
            remain /= 2.0;
        }
        while (remain < 0.5) {
            filters.push("atempo=0.5");
            remain /= 0.5;
        }
        filters.push(`atempo=${remain}`);
        return filters.join(",");
    };

    let args: string[];

    if (speedUpGif && (await $mapi.file.exists(speedUpGif))) {
        // 添加加速图标和半透明遮罩
        // GIF缩放到 236x181
        let gifWidth = 236;
        let gifHeight = 181;
        if (option.width > option.height) {
            gifHeight = Math.floor(option.height / 5);
            gifWidth = -1;
        } else {
            gifWidth = Math.floor(option.width / 5);
            gifHeight = -1;
        }
        // console.log('gif size:', {gifWidth, gifHeight});
        args = [
            "-i",
            input,
            "-ignore_loop",
            "0",
            "-i",
            speedUpGif,
            "-filter_complex",
            `[0:v]setpts=${(1 / speed).toFixed(6)}*PTS,` +
                `drawbox=x=0:y=0:w=iw:h=ih:color=black@0.2:t=fill[video_masked];` +
                `[1:v]scale=${gifWidth}:${gifHeight}[icon];` +
                `[video_masked][icon]overlay=(W-w)/2:(H-h)/2[v];` +
                `[0:a]${buildAtempoFilter(speed)}[a]`,
            "-map",
            "[v]",
            "-map",
            "[a]",
            "-t",
            outputDuration.toString(),
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "0",
            "-c:a",
            "aac",
            "-y",
            output,
        ];
    } else {
        // 原有的变速处理
        args = [
            "-i",
            input,
            "-filter_complex",
            `[0:v]setpts=${(1 / speed).toFixed(6)}*PTS[v];[0:a]${buildAtempoFilter(speed)}[a]`,
            "-map",
            "[v]",
            "-map",
            "[a]",
            "-t",
            outputDuration.toString(),
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "0",
            "-c:a",
            "aac",
            "-y",
            output,
        ];
    }

    console.log("ffmpegChangeSpeed args:", args.join(" "));
    await ffmpegOptimized(args, {
        successFileCheck: output,
    });
    console.log("ffmpegChangeSpeed done");

    return output;
}

export async function videoSpeedPartExecute(
    option: VideoSpeedPartOption,
): Promise<string> {
    const output = await $mapi.file.temp("mp4");
    const cleans: string[] = [];

    // 如果没有需要加速的片段，直接复制原视频
    if (option.times.length === 0) {
        await $mapi.file.copy(option.video, output);
        return output;
    }

    const speedUpGif = await $mapi.app.extraPathResolve(
        "common/image/speedUp.gif",
    );

    // 按时间顺序排序
    const times = [...option.times].sort((a, b) => a.startMs - b.startMs);

    // 1. 分割视频片段
    const segments: {
        file: string;
        startMs: number;
        endMs: number;
        speed: number;
    }[] = [];

    let lastEndMs = 0;

    for (const timeRange of times) {
        // 添加前面的正常速度片段
        if (timeRange.startMs > lastEndMs) {
            const segment = await ffmpegCutVideo(
                option.video,
                lastEndMs,
                timeRange.startMs,
            );
            cleans.push(segment);
            segments.push({
                file: segment,
                startMs: lastEndMs,
                endMs: timeRange.startMs,
                speed: 1,
            });
        }

        // 添加变速片段
        const speedSegment = await ffmpegCutVideo(
            option.video,
            timeRange.startMs,
            timeRange.endMs,
        );
        cleans.push(speedSegment);
        segments.push({
            file: speedSegment,
            startMs: timeRange.startMs,
            endMs: timeRange.endMs,
            speed: option.speed,
        });

        lastEndMs = timeRange.endMs;
    }

    // 添加最后的正常速度片段
    const videoDuration = await ffprobeGetMediaDuration(option.video, true);
    if (lastEndMs < videoDuration) {
        const segment = await ffmpegCutVideo(
            option.video,
            lastEndMs,
            videoDuration,
        );
        cleans.push(segment);
        segments.push({
            file: segment,
            startMs: lastEndMs,
            endMs: videoDuration,
            speed: 1,
        });
    }

    // 2. 对需要变速的片段进行变速处理
    const processedSegments: string[] = [];
    for (const segment of segments) {
        if (segment.speed !== 1) {
            const speedFile = await ffmpegChangeSpeed(
                segment.file,
                segment.speed,
                speedUpGif,
                option,
            );
            cleans.push(speedFile);
            processedSegments.push(speedFile);
        } else {
            processedSegments.push(segment.file);
        }
    }

    // 3. 合并所有片段
    console.log("videoSpeedPartExecute", processedSegments);
    const finalOutput = await ffmpegConcatVideos(processedSegments);

    // 复制到输出文件
    await $mapi.file.copy(finalOutput, output);
    cleans.push(finalOutput);

    if (!(await $mapi.file.exists(output))) {
        throw new Error("Video rendering failed");
    }

    return output;
}
