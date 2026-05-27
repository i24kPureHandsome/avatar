import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type TextCutVideoSegment = {
    start: number;
    end: number;
    text: string;
    include: boolean;
};

export type TextCutVideoModelConfigType = {
    video: string;
    soundAsr: SoundAsrParamType;
};

export type TextCutVideoJobResultType = {
    step: "ToAudio" | "Asr" | "Edit" | "Export" | "End";

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

    Edit: {
        status: TaskJobResultStepStatus;
        records: TextCutVideoSegment[];
        exportMode: "merge" | "separate";
    };

    Export: {
        status: TaskJobResultStepStatus;
        files: string[];
    };
};
