import { t } from "../../../lang";
import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import {
    VideoSpeedPartJobResultType,
    VideoSpeedPartModelConfigType,
} from "./type";
import { videoSpeedPartExecute } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoSpeedPartRun = async (data: {
    taskId: string;
    title: string;
    video: string;
    speed: number;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("VideoSpeedPart.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoSpeedPart",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
                speed: data.speed,
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

export const VideoSpeedPartCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoSpeedPartJobResultType = task.jobResult;
    if (jobResult.Render) {
        if (jobResult.Render.file) {
            files.push(jobResult.Render.file);
        }
    }
    return {
        files,
    };
};

export const VideoSpeedPart: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoSpeedPart.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoSpeedPartModelConfigType = record.modelConfig;
        const jobResult: VideoSpeedPartJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Config = jobResult.Config || { status: "queue" };
        jobResult.Render = jobResult.Render || { status: "queue" };

        if (jobResult.step === "Prepare") {
            console.log("VideoSpeedPart.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoSpeedPart", bizId }, "running");
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
            console.log("VideoSpeedPart.Config", jobResult);
            jobResult.Config.status = "running";
            jobResult.Config.times = [];
            jobResult.Config.status = "pending";
            await TaskService.update(bizId, { jobResult });
            return "success";
        }

        if (jobResult.step === "Render") {
            console.log("VideoSpeedPart.Render", jobResult);
            console.log(
                "VideoSpeedPart.Render",
                JSON.stringify(jobResult, null, 2),
            );
            jobResult.Config.status = "success";
            jobResult.Render.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            // console.log('times', JSON.stringify(times, null, 2));
            try {
                jobResult.Render.file = await videoSpeedPartExecute({
                    video: modelConfig.video,
                    times: jobResult.Config.times,
                    width: jobResult.Prepare.width,
                    height: jobResult.Prepare.height,
                    fps: jobResult.Prepare.fps,
                    speed: modelConfig.speed || 5,
                });
                jobResult.step = "End";
                jobResult.Render.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("VideoSpeedPart render error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            console.log("VideoSpeedPart.End", jobResult);
            return "success";
        }

        throw `VideoSpeedPart.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoSpeedPartJobResultType = record.jobResult;
        if (jobResult.step === "Config") {
            await TaskService.update(bizId, {
                status: "pause",
                statusMsg: t("msg.taskNotCompleteConfirm"),
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
                "VideoSpeedPart.successFunc: unknown jobResult.step",
                jobResult.step,
            );
        }
    },
    failFunc: async (bizId, msg, bizParam) => {
        // console.log('VideoSpeedPart.failFunc', {bizId, bizParam, msg})
        await TaskService.update(bizId, {
            status: "fail",
            statusMsg: msg,
            endTime: Date.now(),
        });
    },
    update: async (bizId, data, bizParam) => {
        console.log("VideoSpeedPart.update", { bizId, data, bizParam });
    },
};
