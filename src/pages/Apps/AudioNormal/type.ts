import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type AudioNormalModelConfigType = {
    file: string; // 输入文件，视频或音频
    normalizationPercentage: number; // 归一化程度，0-100%
};

export type AudioNormalJobResultType = {
    // 处理步骤
    // 1 分析文件 Prepare
    // 2 生成归一化配置 Config
    // 3 渲染文件 Render
    step: "Prepare" | "Config" | "Render" | "End";

    Prepare: {
        status: TaskJobResultStepStatus;
        duration: number;
        width?: number;
        height?: number;
        fps?: number;
        sampleRate?: number;
        channels?: number;
        isVideo: boolean;
    };

    Config: {
        status: TaskJobResultStepStatus;
    };

    Render: {
        status: TaskJobResultStepStatus;
        file: string;
    };
};
