import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import {
    VideoCompressJobResultType,
    VideoCompressModelConfigType,
} from "./type";
import { videoCompressExecute } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoCompressRun = async (data: {
    taskId: string;
    title: string;
    file: string;
    codec: string;
    resolution: string;
    compressionLevel: number;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("AudioNormal.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoCompress",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                file: data.file,
                codec: data.codec,
                resolution: data.resolution,
                compressionLevel: data.compressionLevel,
            },
            param: {},
        };
        taskId = await TaskService.submit(record);
    }
    return {
        taskId,
        result: await createTaskRunResult(taskId, (resultData, task) => {
            resultData.file = task.result?.url;
        }),
    };
};

export const VideoCompressCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoCompressJobResultType = task.jobResult;
    if (jobResult.Compress) {
        if (jobResult.Compress.file) {
            files.push(jobResult.Compress.file);
        }
    }
    return {
        files,
    };
};

export const VideoCompress: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoCompress.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoCompressModelConfigType = record.modelConfig;
        const jobResult: VideoCompressJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Compress = jobResult.Compress || {
            status: "queue",
            file: "",
        };

        if (jobResult.step === "Prepare") {
            console.log("VideoCompress.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoCompress", bizId }, "running");

            // 分析文件信息
            const videoInfo = await ffprobeVideoInfo(modelConfig.file);
            jobResult.Prepare.duration = videoInfo.duration;
            jobResult.Prepare.width = videoInfo.width;
            jobResult.Prepare.height = videoInfo.height;
            jobResult.Prepare.fps = videoInfo.fps;

            jobResult.step = "Compress";
            jobResult.Prepare.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Compress") {
            console.log("VideoCompress.Compress", jobResult);
            jobResult.Compress.status = "running";
            jobResult.Compress.file = await videoCompressExecute(
                modelConfig.file,
                {
                    codec: modelConfig.codec,
                    resolution: modelConfig.resolution,
                    compressionLevel: modelConfig.compressionLevel,
                },
            );
            jobResult.Compress.status = "success";
            jobResult.step = "End";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "End") {
            console.log("VideoCompress.End", jobResult);
            return "success";
        }

        throw `VideoCompress.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoCompressJobResultType = record.jobResult;
        if (jobResult.step === "End") {
            await TaskService.update(bizId, {
                status: "success",
                endTime: Date.now(),
                result: {
                    url: await $mapi.file.hubSave(jobResult.Compress.file),
                },
            });
        } else {
            $mapi.log.error(
                "VideoCompress.successFunc: unknown jobResult.step",
                jobResult.step,
            );
        }
    },
    failFunc: async (bizId, msg, bizParam) => {
        await TaskService.update(bizId, {
            status: "fail",
            statusMsg: msg,
            endTime: Date.now(),
        });
    },
    update: async (bizId, data, bizParam) => {
        console.log("VideoCompress.update", { bizId, data, bizParam });
    },
};
