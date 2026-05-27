import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";
import {
    VideoBackgroundJobResultType,
    VideoBackgroundModelConfigType,
} from "./type";
import { videoBackgroundExecute } from "./util";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoBackgroundRun = async (data: {
    taskId: string;
    title: string;
    video: string;
    image: string;
    imageMode: "cover" | "contain";
    videoX: number;
    videoY: number;
    videoWidth: number;
    videoHeight: number;
    outputWidth: number;
    outputHeight: number;
    videoBorderWidth: number;
    videoBorderColor: string;
    videoBorderOpacity: number;
    videoBorderRadius: number;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("VideoBackground.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoBackground",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
                image: data.image,
                imageMode: data.imageMode,
                videoX: data.videoX,
                videoY: data.videoY,
                videoWidth: data.videoWidth,
                videoHeight: data.videoHeight,
                outputWidth: data.outputWidth,
                outputHeight: data.outputHeight,
                videoBorderWidth: data.videoBorderWidth,
                videoBorderColor: data.videoBorderColor,
                videoBorderOpacity: data.videoBorderOpacity,
                videoBorderRadius: data.videoBorderRadius,
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

export const VideoBackgroundCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoBackgroundJobResultType = task.jobResult;
    if (jobResult.Render) {
        if (jobResult.Render.file) {
            files.push(jobResult.Render.file);
        }
    }
    return {
        files,
    };
};

export const VideoBackground: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoBackground.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoBackgroundModelConfigType = record.modelConfig;
        const jobResult: VideoBackgroundJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Render = jobResult.Render || { status: "queue" };

        if (jobResult.step === "Prepare") {
            console.log("VideoBackground.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoBackground", bizId }, "running");
            const { duration, width, height, fps } = await ffprobeVideoInfo(
                modelConfig.video,
            );
            jobResult.Prepare.duration = duration;
            jobResult.Prepare.width = width;
            jobResult.Prepare.height = height;
            jobResult.Prepare.fps = fps;
            jobResult.step = "Render";
            jobResult.Prepare.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Render") {
            console.log("VideoBackground.Render", jobResult);
            jobResult.Render.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });

            try {
                jobResult.Render.file = await videoBackgroundExecute(
                    modelConfig.video,
                    modelConfig.image,
                    {
                        bizId: bizId,
                        imageMode: modelConfig.imageMode,
                        videoX: modelConfig.videoX,
                        videoY: modelConfig.videoY,
                        outputWidth: modelConfig.outputWidth,
                        outputHeight: modelConfig.outputHeight,
                        videoWidth: modelConfig.videoWidth,
                        videoHeight: modelConfig.videoHeight,
                        videoBorderWidth: modelConfig.videoBorderWidth,
                        videoBorderColor: modelConfig.videoBorderColor,
                        videoBorderOpacity: modelConfig.videoBorderOpacity,
                        videoBorderRadius: modelConfig.videoBorderRadius,
                    },
                );
                jobResult.step = "End";
                jobResult.Render.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("VideoBackground render error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            console.log("VideoBackground.End", jobResult);
            return "success";
        }

        throw `VideoBackground.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoBackgroundJobResultType = record.jobResult;
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
                "VideoBackground.successFunc: unknown jobResult.step",
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
        console.log("VideoBackground.update", { bizId, data, bizParam });
    },
};
