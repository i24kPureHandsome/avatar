import { t } from "../../../lang";
import { ffmpegVideoToAudio } from "../../../lib/ffmpeg";
import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import { serverSoundAsr } from "../../../lib/server";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import {
    VideoQuickCutJobResultType,
    VideoQuickCutModelConfigType,
} from "./type";
import { videoQuickCutExecute } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoQuickCutRun = async (data: {
    taskId: string;
    title: string;
    video: string;
    soundAsr: SoundAsrParamType;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("VideoQuickCut.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoQuickCut",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
                soundAsr: data.soundAsr,
                segments: [],
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

export const VideoQuickCutCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoQuickCutJobResultType = task.jobResult;
    if (jobResult.ToAudio?.file) {
        files.push(jobResult.ToAudio.file);
    }
    if (jobResult.Merge?.file) {
        files.push(jobResult.Merge.file);
    }
    return {
        files,
    };
};

export const VideoQuickCut: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoQuickCut.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoQuickCutModelConfigType = record.modelConfig;
        const jobResult: VideoQuickCutJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "ToAudio";
        jobResult.ToAudio = jobResult.ToAudio || { status: "queue" };
        jobResult.Asr = jobResult.Asr || { status: "queue" };
        jobResult.Confirm = jobResult.Confirm || { status: "queue" };
        jobResult.Merge = jobResult.Merge || { status: "queue" };

        if (jobResult.step === "ToAudio") {
            console.log("VideoQuickCut.ToAudio", jobResult);
            jobResult.ToAudio.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoQuickCut", bizId }, "running");

            // 获取视频信息
            const { duration, width, height, fps } = await ffprobeVideoInfo(
                modelConfig.video,
            );
            jobResult.ToAudio.duration = duration;
            jobResult.ToAudio.width = width;
            jobResult.ToAudio.height = height;
            jobResult.ToAudio.fps = fps;

            // 转换为音频
            const audioFile = await ffmpegVideoToAudio(modelConfig.video);
            jobResult.ToAudio.file = await $mapi.file.hubSave(audioFile);

            jobResult.step = "Asr";
            jobResult.ToAudio.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Asr") {
            console.log("VideoQuickCut.Asr", jobResult);
            jobResult.Asr.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoQuickCut", bizId }, "running");

            const ret = await serverSoundAsr(
                "VideoQuickCut",
                bizId,
                modelConfig.soundAsr,
                jobResult.Asr,
                jobResult.ToAudio.file,
            );

            if (ret.type === "retry") {
                return ret.type;
            }

            jobResult.Asr.start = ret.start;
            jobResult.Asr.end = ret.end;
            jobResult.Asr.records = ret.records;

            jobResult.step = "Confirm";
            jobResult.Asr.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Confirm") {
            console.log("VideoQuickCut.Confirm", jobResult);
            jobResult.Confirm.status = "running";
            jobResult.Confirm.records = jobResult.Asr.records.map((record) => ({
                start: record.start,
                end: record.end,
                text: record.text,
                include: record.text ? true : false,
            }));
            jobResult.Confirm.status = "pending";
            await TaskService.update(bizId, { jobResult });
            return "success";
        }

        if (jobResult.step === "Merge") {
            console.log("VideoQuickCut.Merge", jobResult);
            jobResult.Confirm.status = "success";
            jobResult.Merge.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoQuickCut", bizId }, "running");

            try {
                const outputFile = await videoQuickCutExecute(
                    modelConfig.video,
                    jobResult.Confirm.records,
                );
                jobResult.Merge.file = await $mapi.file.hubSave(outputFile);
                jobResult.step = "End";
                jobResult.Merge.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("VideoQuickCut merge error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            console.log("VideoQuickCut.End", jobResult);
            return "success";
        }

        throw `VideoQuickCut.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoQuickCutJobResultType = record.jobResult;
        if (jobResult.step === "Confirm") {
            await TaskService.update(bizId, {
                status: "pause",
                statusMsg: t("msg.taskNotCompleteConfirmSegments"),
            });
        } else if (jobResult.step === "End") {
            await TaskService.update(bizId, {
                status: "success",
                endTime: Date.now(),
                result: {
                    url: await $mapi.file.hubSave(jobResult.Merge.file),
                },
            });
        } else {
            $mapi.log.error(
                "VideoQuickCut.successFunc: unknown jobResult.step",
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
        console.log("VideoQuickCut.update", { bizId, data, bizParam });
    },
};
