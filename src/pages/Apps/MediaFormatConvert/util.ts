import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { TaskService } from "../../../service/TaskService";

export const mediaFormatConvertExecute = async (
    mediaPath: string,
    option: {
        bizId: string;
        targetFormat: string;
        videoCodec: string;
        audioCodec: string;
        videoBitrate: number;
        audioBitrate: number;
        lossless: boolean;
        isVideo: boolean;
    },
): Promise<string> => {
    const {
        targetFormat,
        videoCodec,
        audioCodec,
        videoBitrate,
        audioBitrate,
        lossless,
        isVideo,
    } = option;
    console.log("MediaFormatConvertExecute", mediaPath, option);

    const outputFile = await $mapi.file.temp(targetFormat);

    let ffmpegArgs: string[] = ["-i", mediaPath];

    // 设置视频编码参数（如果是视频文件）
    if (isVideo) {
        if (lossless) {
            ffmpegArgs.push("-c:v", "libx264");
            ffmpegArgs.push("-preset", "ultrafast");
            ffmpegArgs.push("-crf", "0");
        } else {
            ffmpegArgs.push("-c:v", videoCodec);
            if (videoBitrate > 0) {
                ffmpegArgs.push("-b:v", `${videoBitrate}k`);
            }
        }
    }

    // 设置音频编码参数
    if (lossless) {
        ffmpegArgs.push("-c:a", "aac");
        ffmpegArgs.push("-q:a", "0");
    } else {
        ffmpegArgs.push("-c:a", audioCodec);
        if (audioBitrate > 0) {
            ffmpegArgs.push("-b:a", `${audioBitrate}k`);
        }
    }

    // 添加输出文件
    ffmpegArgs.push("-y", outputFile);

    await ffmpegOptimized(ffmpegArgs, {
        successFileCheck: outputFile,
        onProgress: (progress) => {
            // console.log('MediaFormatConvertExecute progress', progress);
            TaskService.updatePercent(option.bizId, progress);
        },
    });

    return outputFile;
};
