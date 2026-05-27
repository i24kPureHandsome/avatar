import { VideoEditorTimeRangeRecord } from "../../../module/VideoEditor/VideoEditorTimeRangeListSelectorDialog.vue";
import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoKeepPartNode = {
    startTime: number; // 开始时间（秒）
    endTime: number; // 结束时间（秒）
    x: number; // 矩形框X坐标
    y: number; // 矩形框Y坐标
    width: number; // 矩形框宽度
    height: number; // 矩形框高度
    action: "keep" | "remove"; // 操作类型：保留或删除
};

export type VideoKeepPartModelConfigType = {
    video: string;
    action?: "keep" | "remove"; // 操作类型，默认remove
};

export type VideoKeepPartJobResultType = {
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
