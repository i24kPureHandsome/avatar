import { t } from "../../../lang";
import { ffmpegConcatVideos, ffmpegOptimized } from "../../../lib/ffmpeg";
import { TextCutVideoSegment } from "./type";

export const textCutVideoMerge = async (
    videoPath: string,
    segments: TextCutVideoSegment[],
): Promise<string> => {
    const includeSegments = segments.filter((seg) => seg.include);

    if (includeSegments.length === 0) {
        throw new Error(t("error.noSegmentSelected"));
    }

    if (includeSegments.length === 1) {
        const seg = includeSegments[0];
        const outputFile = await $mapi.file.temp("mp4");
        await ffmpegOptimized(
            [
                "-i", videoPath,
                "-ss", (seg.start / 1000).toString(),
                "-to", (seg.end / 1000).toString(),
                "-c", "copy",
                "-y", outputFile,
            ],
            { successFileCheck: outputFile },
        );
        return outputFile;
    }

    const clipFiles: string[] = [];
    for (const seg of includeSegments) {
        const clipFile = await $mapi.file.temp("mp4");
        await ffmpegOptimized(
            [
                "-i", videoPath,
                "-ss", (seg.start / 1000).toString(),
                "-to", (seg.end / 1000).toString(),
                "-c", "copy",
                "-y", clipFile,
            ],
            { successFileCheck: clipFile },
        );
        clipFiles.push(clipFile);
    }

    return await ffmpegConcatVideos(clipFiles);
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
            "-i",
            videoPath,
            "-ss",
            (seg.start / 1000).toString(),
            "-to",
            (seg.end / 1000).toString(),
            "-c",
            "copy",
            "-y",
            outputFile,
        ];
        await ffmpegOptimized(ffmpegArgs, { successFileCheck: outputFile });
        files.push(outputFile);
    }

    return files;
};
