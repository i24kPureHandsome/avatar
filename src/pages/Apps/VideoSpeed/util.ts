import { VideoSpeedNode } from "./type";
import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { TaskService } from "../../../service/TaskService";

export const videoSpeedExecute = async (
    videoPath: string,
    option: {
        bizId: string;
        speed?: number;
        nodes?: VideoSpeedNode[];
    },
): Promise<string> => {
    const outputFile = await $mapi.file.temp("mp4");

    let ffmpegArgs: string[] = ["-i", videoPath];

    const speed = option.speed || 1.0;
    if (speed !== 1.0) {
        ffmpegArgs.push("-filter:v", `setpts=${1 / speed}*PTS`);
        ffmpegArgs.push("-filter:a", `atempo=${speed}`);
    }

    ffmpegArgs.push("-c:v", "libx264");
    ffmpegArgs.push("-preset", "ultrafast");
    ffmpegArgs.push("-crf", "0");
    ffmpegArgs.push("-c:a", "aac");
    ffmpegArgs.push("-y", outputFile);

    await ffmpegOptimized(ffmpegArgs, {
        onProgress: (progress) => {
            // console.log('VideoSizeConvertExecute progress', progress);
            TaskService.updatePercent(option.bizId, progress);
        },
    });

    return outputFile;
};
