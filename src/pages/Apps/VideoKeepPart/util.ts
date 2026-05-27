import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { ffprobeGetMediaDuration } from "../../../lib/ffprobe";

export type VideoKeepPartOption = {
    video: string;
    times: {
        startMs: number;
        endMs: number;
    }[];
    width: number;
    height: number;
    fps: number;
    action: "keep" | "remove";
};

// FFmpeg 工具函数：切割视频片段
async function ffmpegCutVideo(
    input: string,
    startMs: number,
    endMs: number,
): Promise<string> {
    const output = await $mapi.file.temp("mp4");
    const startSeconds = startMs / 1000;
    const durationSeconds = (endMs - startMs) / 1000;

    const args = [
        "-i",
        input,
        "-ss",
        startSeconds.toString(),
        "-t",
        durationSeconds.toString(),
        "-c",
        "copy",
        "-avoid_negative_ts",
        "make_zero",
        "-y",
        output,
    ];

    await ffmpegOptimized(args, { successFileCheck: output });

    return output;
}

// FFmpeg 工具函数：合并多个视频
async function ffmpegConcatVideos(videos: string[]): Promise<string> {
    if (videos.length === 0) {
        throw new Error("No videos to concat");
    }

    if (videos.length === 1) {
        return videos[0];
    }

    const output = await $mapi.file.temp("mp4");
    const txtFile = await $mapi.file.temp("txt");

    // 创建 concat 文件列表
    const lines = videos.map(
        (video) => `file '${video.replace(/'/g, "'\\''")}'`,
    );
    await $mapi.file.write(txtFile, lines.join("\n"));

    const args = [
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        txtFile,
        "-c",
        "copy",
        "-y",
        output,
    ];

    try {
        await ffmpegOptimized(args, { successFileCheck: output });

        return output;
    } finally {
        // 清理临时文件列表
        if (await $mapi.file.exists(txtFile)) {
            await $mapi.file.deletes(txtFile);
        }
    }
}

export async function videoKeepPartExecute(
    option: VideoKeepPartOption,
): Promise<string> {
    const output = await $mapi.file.temp("mp4");
    const cleans: string[] = [];

    try {
        // 按时间顺序排序
        const times = [...option.times].sort((a, b) => a.startMs - b.startMs);

        const videoDuration = await ffprobeGetMediaDuration(option.video, true);

        let segments: {
            file: string;
            startMs: number;
            endMs: number;
        }[] = [];

        if (option.action === "keep") {
            // 保留模式：只保留选中的片段
            for (const timeRange of times) {
                const segment = await ffmpegCutVideo(
                    option.video,
                    timeRange.startMs,
                    timeRange.endMs,
                );
                cleans.push(segment);
                segments.push({
                    file: segment,
                    startMs: timeRange.startMs,
                    endMs: timeRange.endMs,
                });
            }
        } else {
            // 删除模式：保留未选中的片段
            let lastEndMs = 0;

            for (const timeRange of times) {
                // 添加前面的保留片段
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
                    });
                }
                lastEndMs = timeRange.endMs;
            }

            // 添加最后的保留片段
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
                });
            }
        }

        if (segments.length === 0) {
            throw new Error("No segments to process");
        }

        // 合并所有保留的片段
        const segmentFiles = segments.map((s) => s.file);
        const finalOutput = await ffmpegConcatVideos(segmentFiles);

        // 复制到输出文件
        await $mapi.file.copy(finalOutput, output);
        cleans.push(finalOutput);

        if (!(await $mapi.file.exists(output))) {
            throw new Error("Video rendering failed");
        }

        return output;
    } finally {
        // 清理临时文件
        for (const clean of cleans) {
            try {
                if (await $mapi.file.exists(clean)) {
                    await $mapi.file.deletes(clean);
                }
            } catch (e) {
                console.warn("Failed to clean temp file:", clean);
            }
        }
    }
}
