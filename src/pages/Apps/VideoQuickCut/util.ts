import { t } from "../../../lang";
import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { VideoQuickCutSegment } from "./type";

export const videoQuickCutExecute = async (
    videoPath: string,
    segments: VideoQuickCutSegment[],
): Promise<string> => {
    const outputFile = await $mapi.file.temp("mp4");

    // 筛选出需要包含的片段
    const includeSegments = segments.filter((seg) => seg.include);

    if (includeSegments.length === 0) {
        throw new Error(t("error.noSegmentSelected"));
    }

    // 构建FFmpeg命令，使用concat filter合并多个片段
    let ffmpegArgs: string[] = ["-i", videoPath];

    // 为每个片段创建filter
    const filterParts: string[] = [];
    for (let i = 0; i < includeSegments.length; i++) {
        const seg = includeSegments[i];
        filterParts.push(
            `[0:v]trim=start=${seg.start / 1000}:end=${seg.end / 1000},setpts=PTS-STARTPTS[v${i}]`,
        );
        filterParts.push(
            `[0:a]atrim=start=${seg.start / 1000}:end=${seg.end / 1000},asetpts=PTS-STARTPTS[a${i}]`,
        );
    }

    // 合并所有片段
    const videoInputs = includeSegments.map((_, i) => `[v${i}]`).join("");
    const audioInputs = includeSegments.map((_, i) => `[a${i}]`).join("");
    filterParts.push(
        `${videoInputs}concat=n=${includeSegments.length}:v=1:a=0[outv]`,
    );
    filterParts.push(
        `${audioInputs}concat=n=${includeSegments.length}:v=0:a=1[outa]`,
    );

    ffmpegArgs.push("-filter_complex", filterParts.join(";"));
    ffmpegArgs.push("-map", "[outv]", "-map", "[outa]");
    ffmpegArgs.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "0");
    ffmpegArgs.push("-c:a", "aac");
    ffmpegArgs.push("-y", outputFile);

    await ffmpegOptimized(ffmpegArgs, { successFileCheck: outputFile });

    return outputFile;
};
