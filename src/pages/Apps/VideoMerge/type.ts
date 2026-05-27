import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoMergeModelConfigType = {
    videos: string[];
    // 转场特效：fade, wipeleft, etc.
    transitionEffect: string;
    // 转场时长（毫秒）
    transitionDuration: number;
};

export type VideoMergeJobResultType = {
    // 处理步骤
    // 1 分析视频 Prepare
    // 2 生成合并配置 Config
    // 3 渲染视频 Render
    step: "Prepare" | "Config" | "Render" | "End";

    Prepare: {
        status: TaskJobResultStepStatus;
        videos: Array<{
            duration: number;
            width: number;
            height: number;
            fps: number;
        }>;
    };

    Config: {
        status: TaskJobResultStepStatus;
    };

    Render: {
        status: TaskJobResultStepStatus;
        file: string;
    };
};
