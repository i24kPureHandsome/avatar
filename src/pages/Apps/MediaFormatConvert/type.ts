import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type MediaFormatConvertModelConfigType = {
    media: string;
    targetFormat: string;
    videoCodec: string;
    audioCodec: string;
    videoBitrate: number;
    audioBitrate: number;
    lossless: boolean;
};

export type MediaFormatConvertJobResultType = {
    // 处理步骤
    // 1 分析媒体 Prepare
    // 2 生成配置 Config
    // 3 转换媒体 Convert
    step: "Prepare" | "Config" | "Convert" | "End";

    Prepare: {
        status: TaskJobResultStepStatus;
        duration: number;
        width?: number;
        height?: number;
        fps?: number;
        audioChannels?: number;
        audioSampleRate?: number;
        isVideo: boolean;
    };

    Config: {
        status: TaskJobResultStepStatus;
    };

    Convert: {
        status: TaskJobResultStepStatus;
        file: string;
    };
};
