import { ffprobeAudioInfo, ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import {
    MediaFormatConvertJobResultType,
    MediaFormatConvertModelConfigType,
} from "./type";
import { mediaFormatConvertExecute } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const MediaFormatConvertRun = async (data: {
    taskId: string;
    title: string;
    media: string;
    targetFormat: string;
    videoCodec: string;
    audioCodec: string;
    videoBitrate: number;
    audioBitrate: number;
    lossless: boolean;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("MediaFormatConvert.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "MediaFormatConvert",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                media: data.media,
                targetFormat: data.targetFormat,
                videoCodec: data.videoCodec,
                audioCodec: data.audioCodec,
                videoBitrate: data.videoBitrate,
                audioBitrate: data.audioBitrate,
                lossless: data.lossless,
            },
            param: {},
        };
        taskId = await TaskService.submit(record);
    }
    return {
        taskId,
        result: await createTaskRunResult(taskId, (resultData, task) => {
            resultData.media = task.result?.url;
        }),
    };
};

export const MediaFormatConvertCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: MediaFormatConvertJobResultType = task.jobResult;
    if (jobResult.Convert) {
        if (jobResult.Convert.file) {
            files.push(jobResult.Convert.file);
        }
    }
    return {
        files,
    };
};

export const MediaFormatConvert: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("MediaFormatConvert.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: MediaFormatConvertModelConfigType =
            record.modelConfig;
        const jobResult: MediaFormatConvertJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Config = jobResult.Config || { status: "queue" };
        jobResult.Convert = jobResult.Convert || { status: "queue" };

        if (jobResult.step === "Prepare") {
            console.log("MediaFormatConvert.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange(
                { biz: "MediaFormatConvert", bizId },
                "running",
            );

            // 检查文件类型
            const fileExt =
                modelConfig.media.toLowerCase().split(".").pop() || "";
            const videoExtensions = [
                "mp4",
                "mov",
                "avi",
                "mkv",
                "wmv",
                "flv",
                "webm",
            ];
            const isVideo = videoExtensions.includes(fileExt);
            jobResult.Prepare.isVideo = isVideo;

            if (isVideo) {
                // 如果是视频文件，获取视频信息
                const { duration, width, height, fps } = await ffprobeVideoInfo(
                    modelConfig.media,
                );
                jobResult.Prepare.duration = duration;
                jobResult.Prepare.width = width;
                jobResult.Prepare.height = height;
                jobResult.Prepare.fps = fps;
            } else {
                // 如果是音频文件，获取音频信息
                const { duration, channels, sampleRate } =
                    await ffprobeAudioInfo(modelConfig.media);
                jobResult.Prepare.duration = duration;
                jobResult.Prepare.audioChannels = channels;
                jobResult.Prepare.audioSampleRate = sampleRate;
            }

            jobResult.step = "Config";
            jobResult.Prepare.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Config") {
            console.log("MediaFormatConvert.Config", jobResult);
            jobResult.Config.status = "running";
            jobResult.step = "Convert";
            jobResult.Config.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Convert") {
            console.log("MediaFormatConvert.Convert", jobResult);
            jobResult.Convert.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });

            try {
                jobResult.Convert.file = await mediaFormatConvertExecute(
                    modelConfig.media,
                    {
                        bizId,
                        targetFormat: modelConfig.targetFormat,
                        videoCodec: modelConfig.videoCodec,
                        audioCodec: modelConfig.audioCodec,
                        videoBitrate: modelConfig.videoBitrate,
                        audioBitrate: modelConfig.audioBitrate,
                        lossless: modelConfig.lossless,
                        isVideo: jobResult.Prepare.isVideo,
                    },
                );
                jobResult.step = "End";
                jobResult.Convert.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("MediaFormatConvert convert error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            console.log("MediaFormatConvert.End", jobResult);
            return "success";
        }

        throw `MediaFormatConvert.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: MediaFormatConvertJobResultType = record.jobResult;
        if (jobResult.step === "End") {
            await TaskService.update(bizId, {
                status: "success",
                endTime: Date.now(),
                result: {
                    url: await $mapi.file.hubSave(jobResult.Convert.file),
                },
            });
        } else {
            $mapi.log.error(
                "MediaFormatConvert.successFunc: unknown jobResult.step",
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
        console.log("MediaFormatConvert.update", { bizId, data, bizParam });
    },
};
