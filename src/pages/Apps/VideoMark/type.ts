import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoMarkNode = {
    startTime: number; // 开始时间（秒）
    endTime: number; // 结束时间（秒）
    x: number; // 矩形框X坐标
    y: number; // 矩形框Y坐标
    width: number; // 矩形框宽度
    height: number; // 矩形框高度
};

export type VideoMarkModelConfigType = {
    video: string;
    borderColor: string;
    borderWidth: number;
    borderOpacity: number;
    borderRadius: number;
    borderStyle: "solid" | "dashed";
};

export type VideoMarkJobResultType = {
    // 处理步骤
    // 1 分析视频 Prepare
    // 2 生成标注 Config
    // 3 渲染视频 Render
    // 4 确认视频 RenderConfirm
    // 5 结束 End
    step: "Prepare" | "Config" | "Render" | "RenderConfirm" | "End";

    Prepare: {
        status: TaskJobResultStepStatus;
        duration: number;
        width: number;
        height: number;
        fps: number;
    };

    Config: {
        status: TaskJobResultStepStatus;
        times: {
            startMs: number;
            endMs: number;
            x: number;
            y: number;
            width: number;
            height: number;
        }[];
    };

    Render: {
        status: TaskJobResultStepStatus;
        file: string;
    };

    RenderConfirm: {
        status: TaskJobResultStepStatus;
    };
};
