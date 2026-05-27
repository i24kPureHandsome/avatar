import { ffprobeAudioInfo, ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import { AudioNormalJobResultType, AudioNormalModelConfigType } from "./type";
import { audioNormalExecute } from "./util";

import { FileUtil } from "../../../lib/file";
import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const AudioNormalRun = async (data: {
    taskId: string;
    title: string;
    file: string;
    normalizationPercentage: number;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("AudioNormal.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "AudioNormal",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                file: data.file,
                normalizationPercentage: data.normalizationPercentage,
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

export const AudioNormalCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: AudioNormalJobResultType = task.jobResult;
    if (jobResult.Render) {
        if (jobResult.Render.file) {
            files.push(jobResult.Render.file);
        }
    }
    return {
        files,
    };
};

export const AudioNormal: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("AudioNormal.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: AudioNormalModelConfigType = record.modelConfig;
        const jobResult: AudioNormalJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Config = jobResult.Config || { status: "queue" };
        jobResult.Render = jobResult.Render || { status: "queue" };

        if (jobResult.step === "Prepare") {
            console.log("AudioNormal.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "AudioNormal", bizId }, "running");

            // 分析文件信息
            let isVideo = false;
            const ext = FileUtil.getExt(modelConfig.file);
            if (["mp4"].includes(ext)) {
                isVideo = true;
            }
            jobResult.Prepare.isVideo = isVideo;
            if (isVideo) {
                const videoInfo = await ffprobeVideoInfo(modelConfig.file);
                jobResult.Prepare.duration = videoInfo.duration;
                jobResult.Prepare.width = videoInfo.width;
                jobResult.Prepare.height = videoInfo.height;
                jobResult.Prepare.fps = videoInfo.fps;
            } else {
                const audioInfo = await ffprobeAudioInfo(modelConfig.file);
                jobResult.Prepare.duration = audioInfo.duration;
                jobResult.Prepare.sampleRate = audioInfo.sampleRate;
                jobResult.Prepare.channels = audioInfo.channels;
            }

            jobResult.step = "Config";
            jobResult.Prepare.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Config") {
            console.log("AudioNormal.Config", jobResult);
            jobResult.Config.status = "running";
            jobResult.step = "Render";
            jobResult.Config.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Render") {
            console.log("AudioNormal.Render", jobResult);
            jobResult.Render.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });

            try {
                jobResult.Render.file = await audioNormalExecute(
                    modelConfig.file,
                    {
                        normalizationPercentage:
                            modelConfig.normalizationPercentage || 100,
                    },
                );
                jobResult.step = "End";
                jobResult.Render.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("AudioNormal render error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            console.log("AudioNormal.End", jobResult);
            return "success";
        }

        throw `AudioNormal.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: AudioNormalJobResultType = record.jobResult;
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
                "AudioNormal.successFunc: unknown jobResult.step",
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
        console.log("AudioNormal.update", { bizId, data, bizParam });
    },
};
