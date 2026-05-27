import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type VideoCompressModelConfigType = {
    file: string; // 输入文件，视频
    codec: string; // 编码，如libx264
    resolution: string; // 分辨率，如1920x1080
    compressionLevel: number; // 压缩程度，0-100%
};

export type VideoCompressJobResultType = {
    // 处理步骤
    // 1 分析文件 Prepare
    // 2 压缩视频 Compress
    // 3 完成 End
    step: "Prepare" | "Compress" | "End";

    Prepare: {
        status: TaskJobResultStepStatus;
        duration: number;
        width?: number;
        height?: number;
        fps?: number;
    };

    Compress: {
        status: TaskJobResultStepStatus;
        file: string;
    };
};
