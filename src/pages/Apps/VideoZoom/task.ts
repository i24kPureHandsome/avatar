import { t } from "../../../lang";
import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import { VideoZoomJobResultType, VideoZoomModelConfigType } from "./type";
import { videoZoomExecute } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoZoomRun = async (data: {
    taskId: string;
    title: string;
    video: string;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("VideoZoom.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoZoom",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
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

export const VideoZoomCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoZoomJobResultType = task.jobResult;
    if (jobResult.Render) {
        if (jobResult.Render.file) {
            files.push(jobResult.Render.file);
        }
    }
    return {
        files,
    };
};

export const VideoZoom: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoZoom.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoZoomModelConfigType = record.modelConfig;
        const jobResult: VideoZoomJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Config = jobResult.Config || { status: "queue" };
        jobResult.Render = jobResult.Render || { status: "queue" };
        jobResult.RenderConfirm = jobResult.RenderConfirm || {
            status: "queue",
        };

        if (jobResult.step === "Prepare") {
            console.log("VideoZoom.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoZoom", bizId }, "running");
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
            console.log("VideoZoom.Config", jobResult);
            jobResult.Config.status = "running";
            jobResult.Config.times = [];
            jobResult.Config.status = "pending";
            await TaskService.update(bizId, { jobResult });
            return "success";
        }

        if (jobResult.step === "Render") {
            console.log("VideoZoom.Render", jobResult);
            console.log("VideoZoom.Render", JSON.stringify(jobResult, null, 2));
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
                // 按照比例放大至视频比例，将框选的部分放在中间，如果是边框位置，则贴边
                const videoRatio = videoWidth / videoHeight;
                const boxRatio = width / height;
                if (boxRatio > videoRatio) {
                    // 框选区域太宽，增加高度以匹配视频比例
                    const newHeight = width / videoRatio;
                    const delta = (newHeight - height) / 2;
                    y -= delta;
                    height = newHeight;
                } else if (boxRatio < videoRatio) {
                    // 框选区域太高，增加宽度以匹配视频比例
                    const newWidth = height * videoRatio;
                    const delta = (newWidth - width) / 2;
                    x -= delta;
                    width = newWidth;
                }
                // 再次确保在视频范围内
                x = Math.floor(Math.min(Math.max(0, x), videoWidth - width));
                y = Math.floor(Math.min(Math.max(0, y), videoHeight - height));
                width = Math.floor(width);
                height = Math.floor(height);
                return { ...t, x, y, width, height };
            });
            // console.log('times', JSON.stringify(times, null, 2));
            try {
                jobResult.Render.file = await videoZoomExecute({
                    bizId,
                    video: modelConfig.video,
                    times,
                    width: jobResult.Prepare.width,
                    height: jobResult.Prepare.height,
                    fps: jobResult.Prepare.fps,
                    zoomDurationMs: modelConfig.zoomDurationMs || 500,
                });
                jobResult.step = "RenderConfirm";
                jobResult.Render.status = "success";
                await TaskService.update(bizId, { jobResult });
            } catch (error) {
                console.error("VideoZoom render error:", error);
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

        throw `VideoZoom.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoZoomJobResultType = record.jobResult;
        if (jobResult.step === "Config") {
            await TaskService.update(bizId, {
                status: "pause",
                statusMsg: t("msg.taskNotCompleteConfirm"),
            });
        } else if (jobResult.step === "RenderConfirm") {
            await TaskService.update(bizId, {
                status: "pause",
                statusMsg: t("msg.taskNotCompleteConfirmFinal"),
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
                "VideoZoom.successFunc: unknown jobResult.step",
                jobResult.step,
            );
        }
    },
    failFunc: async (bizId, msg, bizParam) => {
        // console.log('VideoZoom.failFunc', {bizId, bizParam, msg})
        await TaskService.update(bizId, {
            status: "fail",
            statusMsg: msg,
            endTime: Date.now(),
        });
    },
    update: async (bizId, data, bizParam) => {
        console.log("VideoZoom.update", { bizId, data, bizParam });
    },
};
