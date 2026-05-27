import { ffmpegOptimized } from "../../../lib/ffmpeg";

export const videoCompressExecute = async (
    inputPath: string,
    config: {
        codec: string;
        resolution: string;
        compressionLevel: number;
    },
): Promise<string> => {
    const outputFile = await $mapi.file.temp("mp4");

    const [width, height] = config.resolution.split("x").map(Number);
    const quality = Math.max(
        18,
        51 - Math.floor(config.compressionLevel * 0.33),
    ); // CRF from 51 (worst) to 18 (best)

    let ffmpegArgs: string[] = [
        "-i",
        inputPath,
        "-vf",
        `scale=${width}:${height}`,
        "-c:v",
        config.codec,
        "-pix_fmt",
        "yuv420p",
        "-crf",
        quality.toString(),
        "-c:a",
        "aac",
        "-y",
        outputFile,
    ];

    await ffmpegOptimized(ffmpegArgs, { successFileCheck: outputFile });
    return outputFile;
};
