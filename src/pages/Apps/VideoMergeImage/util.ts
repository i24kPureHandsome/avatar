import { t } from "../../../lang";
import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { ffprobeVideoInfo } from "../../../lib/ffprobe";

export const videoMergeImageExecute = async (
    videoPath: string,
    config: {
        image: string;
        position: "start" | "end";
        duration: number;
        animation: "none" | "zoom";
        zoomPercent?: number;
    },
): Promise<string> => {
    console.log("videoMergeImageExecute", videoPath, config);

    const outputFile = await $mapi.file.temp("mp4");

    const filesToClean: string[] = [];

    const videoInfo = await ffprobeVideoInfo(videoPath);
    if (!videoInfo) {
        throw new Error(t("error.videoInfo"));
    }

    const imageVideo = await $mapi.file.temp("mp4");
    filesToClean.push(imageVideo);

    // 构建视频滤镜
    let vf = `fps=${videoInfo.fps}`;

    if (
        config.animation === "zoom" &&
        config.zoomPercent &&
        config.zoomPercent > 0
    ) {
        // 计算图片视频的总帧数
        const totalFrames = Math.floor(config.duration * videoInfo.fps);

        // 使用zoompan滤镜实现缩放动画
        // 从原始大小（100%）逐渐放大到指定大小
        const maxZoom = 1 + config.zoomPercent / 100;
        const zoomExpression = `1+${config.zoomPercent / 100}*on/${totalFrames}`;

        vf += `,zoompan=z='${zoomExpression}':d=${totalFrames}:x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':s=${videoInfo.width}x${videoInfo.height}`;
    } else {
        // 无动画时，直接调整尺寸
        vf += `,scale=${videoInfo.width}:${videoInfo.height}:force_original_aspect_ratio=decrease,pad=${videoInfo.width}:${videoInfo.height}:(ow-iw)/2:(oh-ih)/2`;
    }
    const args = [
        "-loop",
        "1",
        "-i",
        config.image,
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=44100:cl=stereo",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "0",
        "-c:a",
        "aac",
        "-t",
        config.duration.toString(),
        "-pix_fmt",
        "yuv420p",
        "-vf",
        vf,
        "-shortest",
        "-y",
        imageVideo,
    ];

    console.log(
        "ffmpeg args:",
        args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" "),
    );

    // 先将图片转换为视频，方便后续处理
    await ffmpegOptimized(args, {
        successFileCheck: imageVideo,
    });

    // 合并视频
    const inputs =
        config.position === "start"
            ? [imageVideo, videoPath]
            : [videoPath, imageVideo];
    const concatArgs = [
        "-i",
        inputs[0],
        "-i",
        inputs[1],
        "-filter_complex",
        "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]",
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "0",
        "-c:a",
        "aac",
        "-r",
        videoInfo.fps.toString(),
        "-y",
        outputFile,
    ];

    console.log(
        "ffmpeg concat args:",
        concatArgs.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" "),
    );

    await ffmpegOptimized(concatArgs, {
        successFileCheck: outputFile,
    });

    // 清理临时文件
    for (const file of filesToClean) {
        await $mapi.file.deletes(file, { isDataPath: false });
    }

    return outputFile;
};
