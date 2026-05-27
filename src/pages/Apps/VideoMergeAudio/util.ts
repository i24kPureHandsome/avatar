import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { ffprobeAudioInfo, ffprobeVideoInfo } from "../../../lib/ffprobe";

export const videoMergeAudioExecute = async (
    videoPath: string,
    audioPath: string,
    config: {
        volume?: number;
        loopAudio?: boolean;
        fadeInTime?: number;
        fadeOutTime?: number;
    },
): Promise<string> => {
    const filesToClean: string[] = [];
    const outputFile = await $mapi.file.temp("mp4");

    const volume = config.volume || 100;

    const videoInfo = await ffprobeVideoInfo(videoPath);
    const videoAudioInfo = await ffprobeAudioInfo(videoPath);
    const audioInfo = await ffprobeAudioInfo(audioPath);

    let processedAudioPath = audioPath;
    let finalAudioDuration = config.loopAudio
        ? videoInfo.duration
        : audioInfo.duration;

    // 如果音频格式不同，或需要循环，或需要淡入淡出，先预处理音频
    if (
        videoAudioInfo.sampleRate !== audioInfo.sampleRate ||
        videoAudioInfo.channels !== audioInfo.channels ||
        config.loopAudio ||
        (config.fadeInTime && config.fadeInTime > 0) ||
        (config.fadeOutTime && config.fadeOutTime > 0)
    ) {
        processedAudioPath = await $mapi.file.temp("wav");
        filesToClean.push(processedAudioPath);
        let preprocessArgs = [
            "-i",
            audioPath,
            "-ar",
            videoAudioInfo.sampleRate.toString(),
            "-ac",
            videoAudioInfo.channels.toString(),
        ];
        if (config.loopAudio && audioInfo.duration < videoInfo.duration) {
            preprocessArgs.unshift("-stream_loop", "-1");
            preprocessArgs.push("-t", videoInfo.duration.toString());
        }
        // 应用淡入淡出滤镜
        let audioFilters: string[] = [];
        if (config.fadeInTime && config.fadeInTime > 0) {
            audioFilters.push(`afade=t=in:ss=0:d=${config.fadeInTime / 1000}`);
        }
        if (config.fadeOutTime && config.fadeOutTime > 0) {
            const fadeOutStart = Math.max(
                0,
                finalAudioDuration - config.fadeOutTime / 1000,
            );
            audioFilters.push(
                `afade=t=out:st=${fadeOutStart}:d=${config.fadeOutTime / 1000}`,
            );
        }
        if (audioFilters.length > 0) {
            preprocessArgs.push("-af", audioFilters.join(","));
        }
        preprocessArgs.push("-c:a", "pcm_s16le", "-y", processedAudioPath);
        await ffmpegOptimized(preprocessArgs, {
            successFileCheck: processedAudioPath,
        });
    }

    let ffmpegArgs: string[] = ["-i", videoPath, "-i", processedAudioPath];
    // 使用 filter_complex 来混合原音频和新音频
    let filterComplex = "";
    if (volume !== 100) {
        filterComplex = `[1:a]volume=${volume / 100}[a1];[0:a][a1]amix=inputs=2:duration=first:normalize=0[aout]`;
    } else {
        filterComplex = `[0:a][1:a]amix=inputs=2:duration=first:normalize=0[aout]`;
    }
    ffmpegArgs.push("-filter_complex", filterComplex);
    ffmpegArgs = ffmpegArgs.concat([
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-map",
        "0:v:0",
        "-map",
        "[aout]",
        "-shortest",
        "-y",
        outputFile,
    ]);
    await ffmpegOptimized(ffmpegArgs, { successFileCheck: outputFile });

    $mapi.file.clean(filesToClean, { isDataPath: false }).then();

    return outputFile;
};
