import { ffmpegOptimized } from "../../../lib/ffmpeg";

export const videoMergeExecute = async (
    videoPaths: string[],
    config: {
        transitionEffect: string;
        transitionDuration: number;
    },
    videoInfos: Array<{
        duration: number;
        width: number;
        height: number;
        fps: number;
    }>,
): Promise<string> => {
    const filesToClean: string[] = [];
    const outputFile = await $mapi.file.temp("mp4");

    const transitionEffect = config.transitionEffect || "none";
    const transitionDuration = (config.transitionDuration || 500) / 1000; // 转换为秒

    if (videoPaths.length === 1) {
        // 只有一个视频，直接复制
        await ffmpegOptimized(
            ["-i", videoPaths[0], "-c", "copy", "-y", outputFile],
            { successFileCheck: outputFile },
        );
    } else {
        // 使用xfade filter实现转场效果
        const inputs: string[] = [];
        for (const videoPath of videoPaths) {
            inputs.push("-i", videoPath);
        }

        // 确定目标分辨率，使用第一个视频的分辨率
        const targetWidth = videoInfos[0].width;
        const targetHeight = videoInfos[0].height;
        const targetFps = videoInfos[0].fps;

        let filterComplex = "";
        // 为每个视频输入添加缩放滤镜和帧率标准化
        for (let i = 0; i < videoPaths.length; i++) {
            filterComplex += `[${i}:v]scale=${targetWidth}:${targetHeight},fps=${targetFps}[scaled_${i}];`;
        }

        let currentLabel = "[scaled_0]";
        let outputIndex = 0;

        if (transitionEffect === "none") {
            // 无转场，直接拼接视频
            for (let i = 1; i < videoPaths.length; i++) {
                const nextLabel = `[scaled_${i}]`;
                const outLabel = `[out${outputIndex}]`;
                filterComplex += `${currentLabel}${nextLabel}concat=n=2:v=1:a=0${outLabel};`;
                currentLabel = outLabel;
                outputIndex++;
            }
        } else {
            // 有转场，使用xfade
            for (let i = 1; i < videoPaths.length; i++) {
                const prevDuration = videoInfos[i - 1].duration;
                const offset = Math.max(0, prevDuration - transitionDuration);
                const nextLabel = `[scaled_${i}]`;
                const outLabel = `[out${outputIndex}]`;
                filterComplex += `${currentLabel}${nextLabel}xfade=transition=${transitionEffect}:duration=${transitionDuration}:offset=${offset}${outLabel};`;
                currentLabel = outLabel;
                outputIndex++;
            }
        }

        // 移除最后一个分号
        filterComplex = filterComplex.slice(0, -1);

        // 处理音频：简单拼接音频流
        let audioFilter = "";
        for (let i = 0; i < videoPaths.length; i++) {
            audioFilter += `[${i}:a]`;
        }
        audioFilter += `concat=n=${videoPaths.length}:v=0:a=1[a]`;

        filterComplex += `;${audioFilter}`;

        const ffmpegArgs = inputs;
        ffmpegArgs.push("-filter_complex", filterComplex);
        ffmpegArgs.push("-map", currentLabel, "-map", "[a]");
        ffmpegArgs.push(
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "0",
            "-c:a",
            "aac",
            "-y",
            outputFile,
        );

        await ffmpegOptimized(ffmpegArgs);
    }

    $mapi.file.clean(filesToClean, { isDataPath: false }).then();

    return outputFile;
};
