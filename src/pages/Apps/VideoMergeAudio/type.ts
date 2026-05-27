import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoMergeAudioModelConfigType = {
    video: string;
    audio: string;
    volume?: number; // 音频音量，默认1.0
    loopAudio?: boolean; // 是否循环音频，默认false
    fadeInTime?: number; // 淡入时间（毫秒），默认0
    fadeOutTime?: number; // 淡出时间（毫秒），默认0
};

export type VideoMergeAudioJobResultType = {
    // 处理步骤
    // 1 分析视频和音频 Prepare
    // 2 生成合并配置 Config
    // 3 渲染视频 Render
    step: "Prepare" | "Config" | "Render" | "End";

    Prepare: {
        status: TaskJobResultStepStatus;
        videoDuration: number;
        videoWidth: number;
        videoHeight: number;
        videoFps: number;
        audioDuration: number;
        audioSampleRate: number;
        audioChannels: number;
    };

    Config: {
        status: TaskJobResultStepStatus;
    };

    Render: {
        status: TaskJobResultStepStatus;
        file: string;
    };
};
