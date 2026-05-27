import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type FfmpegModelConfigType = {
    input1: string;
    input2: string;
    input3: string;
    input4: string;
    input5: string;
    commands: string[];
};

export type FfmpegJobResultType = {
    // 处理步骤
    // 1 准备文件 Prepare
    // 2 构建命令 Command
    // 3 执行处理 Execute
    step: "Prepare" | "Execute" | "End";

    Prepare: {
        status: TaskJobResultStepStatus;
        commands: string[];
        inputsMap: Record<string, string>;
        outputsMap: Record<string, string>;
    };

    Execute: {
        status: TaskJobResultStepStatus;
        files: string[];
    };
};
