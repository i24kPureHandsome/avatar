import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoQuickCutSegment = {
    start: number; // 开始时间（毫秒）
    end: number; // 结束时间（毫秒）
    text: string; // 识别的文字内容
    include: boolean; // 是否包含在最终视频中
};

export type VideoQuickCutModelConfigType = {
    video: string;
    soundAsr: SoundAsrParamType; // ASR参数
};

export type VideoQuickCutJobResultType = {
    // 处理步骤
    // 1 转音频 ToAudio
    // 2 语音识别 Asr
    // 3 确认剪辑 Confirm
    // 4 合并视频 Merge
    step: "ToAudio" | "Asr" | "Confirm" | "Merge" | "End";

    ToAudio: {
        status: TaskJobResultStepStatus;
        file: string;
        duration: number;
        width: number;
        height: number;
        fps: number;
    };

    Asr: {
        status: TaskJobResultStepStatus;
        start: number;
        end: number;
        records: { start: number; end: number; text: string }[];
    };

    Confirm: {
        status: TaskJobResultStepStatus;
        records: VideoQuickCutSegment[];
    };

    Merge: {
        status: TaskJobResultStepStatus;
        file: string;
    };
};
