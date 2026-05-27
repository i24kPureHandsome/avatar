import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { TaskService } from "../../../service/TaskService";

export const videoSizeConvertExecute = async (
    videoPath: string,
    option: {
        bizId: string;
        targetWidth: number;
        targetHeight: number;
        fillMode: "blur" | "black" | "crop" | "stretch";
    },
): Promise<string> => {
    const { targetWidth, targetHeight, fillMode } = option;
    console.log("VideoSizeConvertExecute", videoPath, option);
    if (targetWidth <= 0 || targetHeight <= 0) {
        throw new Error(
            "Invalid target dimensions: width and height must be positive numbers",
        );
    }

    const outputFile = await $mapi.file.temp("mp4");

    let ffmpegArgs: string[] = ["-i", videoPath];

    if (fillMode === "crop") {
        // crop模式：以cover的模式转换为目标尺寸，裁剪多余部分
        ffmpegArgs.push(
            "-vf",
            `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},setsar=1`,
        );
    } else if (fillMode === "blur") {
        // blur模式：将视频重新放大以cover的模式作为背景，前景视频以contain模式居中显示
        const blurFilter = [
            // 创建模糊背景：将原视频放大到填满目标尺寸并模糊
            `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},gblur=sigma=20[bg]`,
            // 创建前景视频：以contain模式缩放并居中
            `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease[fg]`,
            // 将模糊背景和前景视频合成，并设置正确的像素宽高比
            `[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1`,
        ].join(";");
        ffmpegArgs.push("-filter_complex", blurFilter);
    } else if (fillMode === "black") {
        // black模式：以contain的模式转换为目标尺寸，多余的部分使用黑色填充
        ffmpegArgs.push(
            "-vf",
            `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`,
        );
    } else if (fillMode === "stretch") {
        // stretch模式：强制拉伸视频到目标尺寸，不保持宽高比
        ffmpegArgs.push("-vf", `scale=${targetWidth}:${targetHeight},setsar=1`);
    }

    ffmpegArgs.push("-c:v", "libx264");
    ffmpegArgs.push("-preset", "ultrafast");
    ffmpegArgs.push("-crf", "0");
    ffmpegArgs.push("-c:a", "aac");
    // 确保输出视频的分辨率正确
    ffmpegArgs.push("-s", `${targetWidth}x${targetHeight}`);
    ffmpegArgs.push("-y", outputFile);

    await ffmpegOptimized(ffmpegArgs, {
        onProgress: (progress) => {
            // console.log('VideoSizeConvertExecute progress', progress);
            TaskService.updatePercent(option.bizId, progress);
        },
    });

    return outputFile;
};
