import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoSizeConvertModelConfigType = {
    video: string;
    targetWidth: number;
    targetHeight: number;
    fillMode: "blur" | "black" | "crop" | "stretch"; // 填充方式：模糊填充、黑边填充、裁剪填充、拉伸填充
};

export type VideoSizeConvertJobResultType = {
    // 处理步骤
    // 1 分析视频 Prepare
    // 2 生成配置 Config
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
