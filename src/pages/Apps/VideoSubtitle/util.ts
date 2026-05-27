import { EmbedSubtitlesClip, MP4Clip, OffscreenSprite } from "@webav/av-cliper";
import { VideoSubtitleJobResultType } from "./type";
import { subtitleParseSrtFile } from "../../../lib/subtitle";
import { webavCombinator, webavWriteStream } from "../../../lib/webav";
import { TaskService } from "../../../service/TaskService";

type VideoSubtitleOption = {
    bizId: string;
};

/**
 * 执行添加字幕合成
 */
export const videoSubtitleExecute = async (
    jobResult: VideoSubtitleJobResultType,
    videoFile: string,
    subtitleFile: string,
    outputFile: string,
    option: VideoSubtitleOption,
) => {
    const content: { start: number; end: number; text: string }[] =
        await subtitleParseSrtFile(subtitleFile);

    // 创建视频clip
    const videoStream = await $mapi.file.readStream(videoFile, {
        isDataPath: false,
    });
    if (!videoStream) {
        throw new Error("Failed to read video stream");
    }

    const videoSpr = new OffscreenSprite(new MP4Clip(videoStream));
    videoSpr.time = {
        duration: Math.floor(jobResult.Prepare.duration * 1e6),
        offset: 0,
    };
    const fontSize = Math.floor(
        Math.min(jobResult.Prepare.width, jobResult.Prepare.height) / 20,
    );
    const srtSpr = new OffscreenSprite(
        new EmbedSubtitlesClip(content, {
            videoWidth: jobResult.Prepare.width,
            videoHeight: jobResult.Prepare.height,
            fontSize: fontSize,
            fontFamily: "Noto Sans SC",
            color: "#FFFFFF",
            strokeStyle: "#000000",
            lineWidth: 20,
            lineJoin: "round",
            lineCap: "round",
            bottomOffset: fontSize * 2,
            textShadow: {
                offsetX: 2,
                offsetY: 2,
                blur: 4,
                color: "rgba(0,0,0,0.25)",
            },
        }),
    );
    srtSpr.time = {
        duration: Math.floor(jobResult.Prepare.duration * 1e6),
        offset: 0,
    };

    const com = webavCombinator({
        width: jobResult.Prepare.width,
        height: jobResult.Prepare.height,
    });
    let error: any = null;
    com.on("OutputProgress", (percent) => {
        try {
            TaskService.cancelCheck("VideoSubtitle", option.bizId);
        } catch (e) {
            com.destroy();
            error = e;
        }
        TaskService.updatePercent(option.bizId, percent);
    });

    await com.addSprite(videoSpr);
    await com.addSprite(srtSpr);
    await webavWriteStream(outputFile, com);
    if (error) {
        throw error;
    }
    return outputFile;
};
