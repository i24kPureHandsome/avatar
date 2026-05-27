import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import { VideoMarkJobResultType, VideoMarkModelConfigType } from "./type";
import { videoMarkExecute } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoMarkRun = async (data: {
    taskId: string;
    title: string;
    video: string;
    borderColor: string;
    borderWidth: number;
    borderOpacity: number;
    borderRadius: number;
    borderStyle: "solid" | "dashed";
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("VideoMark.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoMark",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
                borderColor: data.borderColor,
                borderWidth: data.borderWidth,
                borderOpacity: data.borderOpacity,
                borderRadius: data.borderRadius,
                borderStyle: data.borderStyle,
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

export const VideoMarkCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoMarkJobResultType = task.jobResult;
    if (jobResult.Render) {
        if (jobResult.Render.file) {
            files.push(jobResult.Render.file);
        }
    }
    return {
        files,
    };
};

export const VideoMark: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoMark.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoMarkModelConfigType = record.modelConfig;
        const jobResult: VideoMarkJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Config = jobResult.Config || { status: "queue" };
        jobResult.Render = jobResult.Render || { status: "queue" };
        jobResult.RenderConfirm = jobResult.RenderConfirm || {
            status: "queue",
        };

        if (jobResult.step === "Prepare") {
            console.log("VideoMark.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoMark", bizId }, "running");
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
            console.log("VideoMark.Config", jobResult);
            jobResult.Config.status = "running";
            jobResult.Config.times = [];
            jobResult.Config.status = "pending";
            await TaskService.update(bizId, { jobResult });
            return "success";
        }

        if (jobResult.step === "Render") {
            console.log("VideoMark.Render", jobResult);
            console.log("VideoMark.Render", JSON.stringify(jobResult, null, 2));
            jobResult.Config.status = "success";
            jobResult.Render.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            // 开始渲染视频
            const times = jobResult.Config.times.map((t) => {
                // 计算确保在视频范围内
                const { width: videoWidth, height: videoHeight } =
                    jobResult.Prepare;
                let { x, y, width, height } = t;
                if (x < 0) {
                    width += x;
                    x = 0;
                } else if (x + width > videoWidth) {
                    width = videoWidth - x;
                }
                if (y < 0) {
                    height += y;
                    y = 0;
                } else if (y + height > videoHeight) {
                    height = videoHeight - y;
                }
                // 对于标注，不需要缩放，直接使用选定的区域
                x = Math.floor(Math.min(Math.max(0, x), videoWidth - width));
                y = Math.floor(Math.min(Math.max(0, y), videoHeight - height));
                width = Math.floor(width);
                height = Math.floor(height);
                return { ...t, x, y, width, height };
            });
            // console.log('times', JSON.stringify(times, null, 2));
            try {
                jobResult.Render.file = await videoMarkExecute({
                    bizId,
                    video: modelConfig.video,
                    times,
                    width: jobResult.Prepare.width,
                    height: jobResult.Prepare.height,
                    fps: jobResult.Prepare.fps,
                    borderColor: modelConfig.borderColor,
                    borderWidth: modelConfig.borderWidth,
                    borderOpacity: modelConfig.borderOpacity,
                    borderRadius: modelConfig.borderRadius,
                    borderStyle: modelConfig.borderStyle,
                });
                jobResult.step = "RenderConfirm";
                jobResult.Render.status = "success";
                await TaskService.update(bizId, { jobResult });
            } catch (error) {
                console.error("VideoMark render error:", error);
                throw error;
            }
        }

        if (jobResult.step === "RenderConfirm") {
            // user task auto confirm
            if (record.type === TaskType.System) {
                jobResult.RenderConfirm.status = "running";
                jobResult.RenderConfirm.status = "pending";
                await TaskService.update(bizId, {
                    jobResult,
                });
                return "success";
            }
            jobResult.RenderConfirm.status = "success";
            jobResult.step = "End";
            await TaskService.update(bizId, {
                jobResult,
            });
        }

        if (jobResult.step === "End") {
            console.log("SoundReplace.End", jobResult);
            return "success";
        }

        throw `VideoMark.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoMarkJobResultType = record.jobResult;
        if (jobResult.step === "Config") {
            await TaskService.update(bizId, {
                status: "pause",
                statusMsg: "任务未完成，需要手动确认",
            });
        } else if (jobResult.step === "RenderConfirm") {
            await TaskService.update(bizId, {
                status: "pause",
                statusMsg: "任务未完成，需要手动确认终稿",
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
                "VideoMark.successFunc: unknown jobResult.step",
                jobResult.step,
            );
        }
    },
    failFunc: async (bizId, msg, bizParam) => {
        // console.log('VideoMark.failFunc', {bizId, bizParam, msg})
        await TaskService.update(bizId, {
            status: "fail",
            statusMsg: msg,
            endTime: Date.now(),
        });
    },
    update: async (bizId, data, bizParam) => {
        console.log("VideoMark.update", { bizId, data, bizParam });
    },
};
