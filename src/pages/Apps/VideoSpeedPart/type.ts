import { TaskJobResultStepStatus } from "../../../service/TaskService";
import { VideoEditorTimeRangeRecord } from "../../../module/VideoEditor/VideoEditorTimeRangeListSelectorDialog.vue";

export type VideoSpeedPartModelConfigType = {
    video: string;
    speed?: number; // 加速系数，默认5
};

export type VideoSpeedPartJobResultType = {
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
        times: VideoEditorTimeRangeRecord[];
    };

    Render: {
        status: TaskJobResultStepStatus;
        file: string;
    };
};
