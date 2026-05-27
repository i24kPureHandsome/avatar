import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { FileUtil } from "../../../lib/file";

export const audioNormalExecute = async (
    inputPath: string,
    config: {
        normalizationPercentage: number;
    },
): Promise<string> => {
    console.log("audioNormalExecute", config);

    const ext = FileUtil.getExt(inputPath);
    let isVideo = false;
    if (["mp4", "avi", "mov", "mkv"].includes(ext)) {
        isVideo = true;
    }
    const outputFile = await $mapi.file.temp(isVideo ? "mp4" : "mp3");

    // 规范化百分比处理
    // 0% = 静音（音量为0）
    // 100% = 标准音频规范化（-16 LUFS）
    const normalizedPercentage = Math.max(
        0,
        Math.min(100, config.normalizationPercentage),
    );

    let ffmpegArgs: string[] = ["-i", inputPath];

    let filterComplex: string;

    if (normalizedPercentage === 0) {
        // 0% = 静音处理
        filterComplex = "volume=0";
    } else {
        // 1-100% = 先进行响度规范化，然后根据百分比调整音量
        const volumeMultiplier = normalizedPercentage / 100;

        // 使用 loudnorm 进行音频响度规范化到 -16 LUFS（广播标准）
        // 然后通过 volume 滤镜调整最终音量
        filterComplex =
            // `loudnorm=I=-16:LRA=11:TP=-2,` + // 响度标准化
            // `compand=attacks=0.1:decays=0.8:soft-knee=6:points=-80/-80|-70/-60|-30/-15|-6/-3|0/-1,` + // 动态压缩
            // `highpass=f=80,lowpass=f=16000,` + // 高低切滤波
            // `alimiter=limit=0.891,` + // 硬限幅器防爆音
            `loudnorm=I=-18:LRA=11:TP=-3,` + // 响度更低一点
            // compand曲线更柔和：减少极端压缩
            `compand=attacks=0.3:decays=1:soft-knee=12:points=-80/-80|-60/-50|-30/-20|-10/-8|0/-2,` +
            `highpass=f=80,lowpass=f=16000,` + // 高低切滤波
            `alimiter=limit=0.8,` + // limit再降低一些
            `volume=${volumeMultiplier}`; // 调整最终音量
    }
    if (isVideo) {
        ffmpegArgs = ffmpegArgs.concat([
            "-filter_complex",
            `[0:a]${filterComplex}[aout]`,
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-q:a",
            "0",
            "-map",
            "0:v:0",
            "-map",
            "[aout]",
            "-avoid_negative_ts",
            "make_zero",
            "-y",
            outputFile,
        ]);
    } else {
        ffmpegArgs = ffmpegArgs.concat([
            "-af",
            `${filterComplex}`,
            "-c:a",
            "libmp3lame",
            "-q:a",
            "0",
            "-y",
            outputFile,
        ]);
    }
    await ffmpegOptimized(ffmpegArgs, { successFileCheck: outputFile });
    return outputFile;
};
