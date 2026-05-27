import { t } from "../../../lang";
import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { TextCutVideoSegment } from "./type";

export const textCutVideoMerge = async (
    videoPath: string,
    segments: TextCutVideoSegment[],
): Promise<string> => {
    const outputFile = await $mapi.file.temp("mp4");

    const includeSegments = segments.filter((seg) => seg.include);

    if (includeSegments.length === 0) {
        throw new Error(t("error.noSegmentSelected"));
    }

    let ffmpegArgs: string[] = ["-i", videoPath];

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

export const textCutVideoSeparate = async (
    videoPath: string,
    segments: TextCutVideoSegment[],
): Promise<string[]> => {
    const includeSegments = segments.filter((seg) => seg.include);

    if (includeSegments.length === 0) {
        throw new Error(t("error.noSegmentSelected"));
    }

    const files: string[] = [];
    for (let i = 0; i < includeSegments.length; i++) {
        const seg = includeSegments[i];
        const outputFile = await $mapi.file.temp("mp4");
        const ffmpegArgs: string[] = [
            "-i", videoPath,
            "-ss", (seg.start / 1000).toString(),
            "-to", (seg.end / 1000).toString(),
            "-c", "copy",
            "-y", outputFile,
        ];
        await ffmpegOptimized(ffmpegArgs, { successFileCheck: outputFile });
        files.push(outputFile);
    }

    return files;
};
