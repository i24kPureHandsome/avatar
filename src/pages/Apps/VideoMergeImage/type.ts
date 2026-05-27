import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoMergeImageModelConfigType = {
    video: string;
    image: string;
    position: "start" | "end";
    duration: number;
    animation: "none" | "zoom";
    zoomPercent?: number;
};

export type VideoMergeImageJobResultType = {
    // 处理步骤
    // 1 分析视频 Prepare
    // 2 生成合并配置 Config
    // 3 渲染视频 Render
    step: "Prepare" | "Config" | "Render" | "End";

    Prepare: {
        status: TaskJobResultStepStatus;
        duration: number;
        width: number;
        height: number;
        fps: number;
    };

    Config: {
        status: TaskJobResultStepStatus;
    };

    Render: {
        status: TaskJobResultStepStatus;
        file: string;
    };
};
