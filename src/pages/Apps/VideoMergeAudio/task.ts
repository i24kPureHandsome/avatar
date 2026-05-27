import { ffprobeAudioInfo, ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import {
    VideoMergeAudioJobResultType,
    VideoMergeAudioModelConfigType,
} from "./type";
import { videoMergeAudioExecute } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoMergeAudioRun = async (data: {
    taskId: string;
    title: string;
    video: string;
    audio: string;
    volume: number;
    loopAudio: boolean;
    fadeInTime: number;
    fadeOutTime: number;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("VideoMergeAudio.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoMergeAudio",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
                audio: data.audio,
                volume: data.volume,
                loopAudio: data.loopAudio,
                fadeInTime: data.fadeInTime,
                fadeOutTime: data.fadeOutTime,
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

export const VideoMergeAudioCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoMergeAudioJobResultType = task.jobResult;
    if (jobResult.Render) {
        if (jobResult.Render.file) {
            files.push(jobResult.Render.file);
        }
    }
    return {
        files,
    };
};

export const VideoMergeAudio: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoMergeAudio.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoMergeAudioModelConfigType = record.modelConfig;
        const jobResult: VideoMergeAudioJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Config = jobResult.Config || { status: "queue" };
        jobResult.Render = jobResult.Render || { status: "queue" };

        if (jobResult.step === "Prepare") {
            console.log("VideoMergeAudio.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoMergeAudio", bizId }, "running");

            // 分析视频信息
            const videoInfo = await ffprobeVideoInfo(modelConfig.video);
            jobResult.Prepare.videoDuration = videoInfo.duration;
            jobResult.Prepare.videoWidth = videoInfo.width;
            jobResult.Prepare.videoHeight = videoInfo.height;
            jobResult.Prepare.videoFps = videoInfo.fps;

            // 分析音频信息
            const audioInfo = await ffprobeAudioInfo(modelConfig.audio);
            jobResult.Prepare.audioDuration = audioInfo.duration;
            jobResult.Prepare.audioSampleRate = audioInfo.sampleRate;
            jobResult.Prepare.audioChannels = audioInfo.channels;

            jobResult.step = "Config";
            jobResult.Prepare.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Config") {
            console.log("VideoMergeAudio.Config", jobResult);
            jobResult.Config.status = "running";
            jobResult.step = "Render";
            jobResult.Config.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Render") {
            console.log("VideoMergeAudio.Render", jobResult);
            jobResult.Render.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });

            try {
                jobResult.Render.file = await videoMergeAudioExecute(
                    modelConfig.video,
                    modelConfig.audio,
                    {
                        volume: modelConfig.volume || 1.0,
                        loopAudio: modelConfig.loopAudio || false,
                        fadeInTime: modelConfig.fadeInTime || 0,
                        fadeOutTime: modelConfig.fadeOutTime || 0,
                    },
                );
                jobResult.step = "End";
                jobResult.Render.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("VideoMergeAudio render error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            console.log("VideoMergeAudio.End", jobResult);
            return "success";
        }

        throw `VideoMergeAudio.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoMergeAudioJobResultType = record.jobResult;
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
                "VideoMergeAudio.successFunc: unknown jobResult.step",
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
        console.log("VideoMergeAudio.update", { bizId, data, bizParam });
    },
};
