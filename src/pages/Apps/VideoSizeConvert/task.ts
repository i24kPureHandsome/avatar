import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import {
    VideoSizeConvertJobResultType,
    VideoSizeConvertModelConfigType,
} from "./type";
import { videoSizeConvertExecute } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoSizeConvertRun = async (data: {
    taskId: string;
    title: string;
    video: string;
    targetWidth: number;
    targetHeight: number;
    fillMode: "blur" | "black" | "crop" | "stretch";
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("VideoSizeConvert.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoSizeConvert",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
                targetWidth: data.targetWidth,
                targetHeight: data.targetHeight,
                fillMode: data.fillMode,
            },
            param: {},
        };
        taskId = await TaskService.submit(record);
    }
    return {
        taskId,
        result: await createTaskRunResult(taskId, (resultData, task) => {
            resultData.video = task.result?.url;
        }),
    };
};

export const VideoSizeConvertCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoSizeConvertJobResultType = task.jobResult;
    if (jobResult.Render) {
        if (jobResult.Render.file) {
            files.push(jobResult.Render.file);
        }
    }
    return {
        files,
    };
};

export const VideoSizeConvert: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoSizeConvert.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoSizeConvertModelConfigType = record.modelConfig;
        const jobResult: VideoSizeConvertJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Config = jobResult.Config || { status: "queue" };
        jobResult.Render = jobResult.Render || { status: "queue", file: "" };

        if (jobResult.step === "Prepare") {
            console.log("VideoSizeConvert.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoSizeConvert", bizId }, "running");
            const { duration, width, height, fps } = await ffprobeVideoInfo(
                modelConfig.video,
            );
            jobResult.Prepare.duration = duration;
            jobResult.Prepare.width = width;
            jobResult.Prepare.height = height;
            jobResult.Prepare.fps = fps;
            jobResult.step = "Config";
            jobResult.Prepare.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Config") {
            console.log("VideoSizeConvert.Config", jobResult);
            jobResult.Config.status = "running";
            jobResult.step = "Render";
            jobResult.Config.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Render") {
            console.log("VideoSizeConvert.Render", jobResult);
            jobResult.Render.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });

            try {
                jobResult.Render.file = await videoSizeConvertExecute(
                    modelConfig.video,
                    {
                        bizId,
                        targetWidth: modelConfig.targetWidth,
                        targetHeight: modelConfig.targetHeight,
                        fillMode: modelConfig.fillMode,
                    },
                );
                jobResult.step = "End";
                jobResult.Render.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("VideoSizeConvert render error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            console.log("VideoSizeConvert.End", jobResult);
            return "success";
        }

        throw `VideoSizeConvert.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoSizeConvertJobResultType = record.jobResult;
        if (jobResult.step === "End") {
            await TaskService.update(bizId, {
                status: "success",
                endTime: Date.now(),
                result: {
                    url: await $mapi.file.hubSave(jobResult.Render.file),
                },
            });
        } else {
            $mapi.log.error(
                "VideoSizeConvert.successFunc: unknown jobResult.step",
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
        console.log("VideoSizeConvert.update", { bizId, data, bizParam });
    },
};
