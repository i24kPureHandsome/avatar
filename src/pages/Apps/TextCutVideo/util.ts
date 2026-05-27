import { t } from "../../../lang";
import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { TextCutVideoSegment } from "./type";

const clipArgs = (
    videoPath: string,
    startTime: number,
    endTime: number,
    outputFile: string,
    reencode: boolean,
): string[] => {
    if (reencode) {
        return [
            "-i", videoPath,
            "-ss", startTime.toString(),
            "-to", endTime.toString(),
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18",
            "-c:a", "aac",
            "-force_key_frames", "expr:gte(t,n_forced*0.5)",
            "-y", outputFile,
        ];
    }
    return [
        "-i", videoPath,
        "-ss", startTime.toString(),
        "-to", endTime.toString(),
        "-c", "copy",
        "-y", outputFile,
    ];
};

export const textCutVideoMerge = async (
    videoPath: string,
    segments: TextCutVideoSegment[],
): Promise<string> => {
    const includeSegments = segments.filter((seg) => seg.include);

    if (includeSegments.length === 0) {
        throw new Error(t("error.noSegmentSelected"));
    }

    const clipFiles: string[] = [];
    for (const seg of includeSegments) {
        const clipFile = await $mapi.file.temp("ts");
        await ffmpegOptimized(
            clipArgs(
                videoPath,
                seg.start / 1000,
                seg.end / 1000,
                clipFile,
                true,
            ),
            { successFileCheck: clipFile },
        );
        clipFiles.push(clipFile);
    }

    if (clipFiles.length === 1) {
        const outputFile = await $mapi.file.temp("mp4");
        await ffmpegOptimized(
            ["-i", clipFiles[0], "-c", "copy", "-y", outputFile],
            { successFileCheck: outputFile },
        );
        return outputFile;
    }

    const outputFile = await $mapi.file.temp("mp4");
    const txtFile = await $mapi.file.temp("txt");
    const lines = clipFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`);
    await $mapi.file.write(txtFile, lines.join("\n"));
    await ffmpegOptimized(
        [
            "-f", "concat",
            "-safe", "0",
            "-i", txtFile,
            "-c", "copy",
            "-y", outputFile,
        ],
        { successFileCheck: outputFile },
    );
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
    for (const seg of includeSegments) {
        const outputFile = await $mapi.file.temp("mp4");
        await ffmpegOptimized(
            clipArgs(
                videoPath,
                seg.start / 1000,
                seg.end / 1000,
                outputFile,
                true,
            ),
            { successFileCheck: outputFile },
        );
        files.push(outputFile);
    }

    return files;
};
