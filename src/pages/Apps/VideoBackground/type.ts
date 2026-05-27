import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoBackgroundModelConfigType = {
    video: string;
    image: string;
    imageMode: "cover" | "contain";
    videoX: number;
    videoY: number;
    videoWidth: number;
    videoHeight: number;
    outputWidth: number;
    outputHeight: number;
    videoBorderWidth: number;
    videoBorderColor: string;
    videoBorderOpacity: number;
    videoBorderRadius: number;
};

export type VideoBackgroundJobResultType = {
    // 处理步骤
    // 1 分析视频 Prepare
    // 2 合成背景 Render
    step: "Prepare" | "Render" | "End";

    Prepare: {
        status: TaskJobResultStepStatus;
        duration: number;
        width: number;
        height: number;
        fps: number;
    };

    Render: {
        status: TaskJobResultStepStatus;
        file: string;
    };
};
