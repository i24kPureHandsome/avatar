import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import {
    VideoKeepPartJobResultType,
    VideoKeepPartModelConfigType,
} from "./type";
import { videoKeepPartExecute } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoKeepPartRun = async (data: {
    taskId: string;
    title: string;
    video: string;
    action: "keep" | "remove";
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("VideoKeepPart.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoKeepPart" as any,
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
                action: data.action,
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

export const VideoKeepPartCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoKeepPartJobResultType = task.jobResult;
    if (jobResult.Render) {
        if (jobResult.Render.file) {
            files.push(jobResult.Render.file);
        }
    }
    return {
        files,
    };
};

export const VideoKeepPart: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoKeepPart.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoKeepPartModelConfigType = record.modelConfig;
        const jobResult: VideoKeepPartJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Config = jobResult.Config || { status: "queue" };
        jobResult.Render = jobResult.Render || { status: "queue" };

        if (jobResult.step === "Prepare") {
            console.log("VideoKeepPart.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange(
                { biz: "VideoKeepPart" as any, bizId },
                "running",
            );
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
            console.log("VideoKeepPart.Config", jobResult);
            jobResult.Config.status = "running";
            jobResult.Config.times = [];
            jobResult.Config.status = "pending";
            await TaskService.update(bizId, { jobResult });
            return "success";
        }

        if (jobResult.step === "Render") {
            console.log("VideoKeepPart.Render", jobResult);
            console.log(
                "VideoKeepPart.Render",
                JSON.stringify(jobResult, null, 2),
            );
            jobResult.Config.status = "success";
            jobResult.Render.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            try {
                jobResult.Render.file = await videoKeepPartExecute({
                    video: modelConfig.video,
                    times: jobResult.Config.times.map((time) => ({
                        startMs: time.startMs,
                        endMs: time.endMs,
                        action: modelConfig.action || "remove",
                    })),
                    width: jobResult.Prepare.width,
                    height: jobResult.Prepare.height,
                    fps: jobResult.Prepare.fps,
                    action: modelConfig.action || "remove",
                });
                jobResult.step = "End";
                jobResult.Render.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("VideoKeepPart render error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            console.log("VideoKeepPart.End", jobResult);
            return "success";
        }

        throw `VideoKeepPart.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoKeepPartJobResultType = record.jobResult;
        if (jobResult.step === "Config") {
            await TaskService.update(bizId, {
                status: "pause",
                statusMsg: "任务未完成，需要手动确认",
            });
        } else if (jobResult.step === "End") {
            await TaskService.update(bizId, {
                status: "success",
                endTime: Date.now(),
                result: {
                    url: await $mapi.file.hubSave(jobResult.Render.file),
                },
            });
        } else {
            $mapi.log.error(
                "VideoKeepPart.successFunc: unknown jobResult.step",
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
        console.log("VideoKeepPart.update", { bizId, data, bizParam });
    },
};
