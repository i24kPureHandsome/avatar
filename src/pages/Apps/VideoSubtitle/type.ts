import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoSubtitleModelConfigType = {
    video: string;
    subtitle: string; // SRT字幕文件路径
};

export type VideoSubtitleJobResultType = {
    // 处理步骤
    // 1 分析视频和字幕 Prepare
    // 2 合成视频 Render
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
