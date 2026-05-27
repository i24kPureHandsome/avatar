import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoSpeedNode = {
    startTime: number; // 开始时间（秒）
    endTime: number; // 结束时间（秒）
    speed: number; // 速度倍率
};

export type VideoSpeedModelConfigType = {
    video: string;
    speed?: number; // 全局速度倍率，如果没有设置节点则使用此速度
    nodes?: VideoSpeedNode[]; // 变速节点列表
};

export type VideoSpeedJobResultType = {
    // 处理步骤
    // 1 分析视频 Prepare
    // 2 生成变速配置 Config
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
