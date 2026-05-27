import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import { VideoMergeJobResultType, VideoMergeModelConfigType } from "./type";
import { videoMergeExecute } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoMergeRun = async (data: {
    taskId: string;
    title: string;
    videos: string[];
    transitionEffect: string;
    transitionDuration: number;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("VideoMerge.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoMerge",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                videos: data.videos,
                transitionEffect: data.transitionEffect,
                transitionDuration: data.transitionDuration,
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

export const VideoMergeCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoMergeJobResultType = task.jobResult;
    if (jobResult.Render) {
        if (jobResult.Render.file) {
            files.push(jobResult.Render.file);
        }
    }
    return {
        files,
    };
};

export const VideoMerge: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoMerge.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoMergeModelConfigType = record.modelConfig;
        const jobResult: VideoMergeJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Config = jobResult.Config || { status: "queue" };
        jobResult.Render = jobResult.Render || { status: "queue" };

        if (jobResult.step === "Prepare") {
            console.log("VideoMerge.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoMerge", bizId }, "running");

            // 分析所有视频信息
            jobResult.Prepare.videos = [];
            for (const videoPath of modelConfig.videos) {
                const videoInfo = await ffprobeVideoInfo(videoPath);
                jobResult.Prepare.videos.push({
                    duration: videoInfo.duration,
                    width: videoInfo.width,
                    height: videoInfo.height,
                    fps: videoInfo.fps,
                });
            }

            jobResult.step = "Config";
            jobResult.Prepare.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Config") {
            console.log("VideoMerge.Config", jobResult);
            jobResult.Config.status = "running";
            jobResult.step = "Render";
            jobResult.Config.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Render") {
            console.log("VideoMerge.Render", jobResult);
            jobResult.Render.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });

            try {
                jobResult.Render.file = await videoMergeExecute(
                    modelConfig.videos,
                    {
                        transitionEffect:
                            modelConfig.transitionEffect || "fade",
                        transitionDuration:
                            modelConfig.transitionDuration || 500,
                    },
                    jobResult.Prepare.videos,
                );
                jobResult.step = "End";
                jobResult.Render.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("VideoMerge render error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            console.log("VideoMerge.End", jobResult);
            return "success";
        }

        throw `VideoMerge.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoMergeJobResultType = record.jobResult;
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
                "VideoMerge.successFunc: unknown jobResult.step",
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
        console.log("VideoMerge.update", { bizId, data, bizParam });
    },
};
