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
import { TextCutVideoJobResultType, TextCutVideoModelConfigType } from "./type";
import { textCutVideoMerge, textCutVideoSeparate } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const TextCutVideoRun = async (data: {
    taskId: string;
    title: string;
    video: string;
    soundAsr: SoundAsrParamType;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "TextCutVideo",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
                soundAsr: data.soundAsr,
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

export const TextCutVideoCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: TextCutVideoJobResultType = task.jobResult;
    if (jobResult.ToAudio?.file) {
        files.push(jobResult.ToAudio.file);
    }
    if (jobResult.Export?.files) {
        files.push(...jobResult.Export.files);
    }
    return { files };
};

export const TextCutVideo: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: TextCutVideoModelConfigType = record.modelConfig;
        const jobResult: TextCutVideoJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "ToAudio";
        jobResult.ToAudio = jobResult.ToAudio || { status: "queue" };
        jobResult.Asr = jobResult.Asr || { status: "queue" };
        jobResult.Edit = jobResult.Edit || { status: "queue" };
        jobResult.Export = jobResult.Export || { status: "queue" };

        if (jobResult.step === "ToAudio") {
            jobResult.ToAudio.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "TextCutVideo", bizId }, "running");

            const { duration, width, height, fps } = await ffprobeVideoInfo(
                modelConfig.video,
            );
            jobResult.ToAudio.duration = duration;
            jobResult.ToAudio.width = width;
            jobResult.ToAudio.height = height;
            jobResult.ToAudio.fps = fps;

            const audioFile = await ffmpegVideoToAudio(modelConfig.video);
            jobResult.ToAudio.file = await $mapi.file.hubSave(audioFile);

            jobResult.step = "Asr";
            jobResult.ToAudio.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Asr") {
            jobResult.Asr.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "TextCutVideo", bizId }, "running");

            const ret = await serverSoundAsr(
                "TextCutVideo",
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

            jobResult.step = "Edit";
            jobResult.Asr.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Edit") {
            jobResult.Edit.status = "running";
            jobResult.Edit.records = jobResult.Asr.records.map((record) => ({
                start: record.start,
                end: record.end,
                text: record.text,
                include: record.text ? true : false,
            }));
            jobResult.Edit.exportMode = "merge";
            jobResult.Edit.status = "pending";
            await TaskService.update(bizId, { jobResult });
            return "success";
        }

        if (jobResult.step === "Export") {
            jobResult.Edit.status = "success";
            jobResult.Export.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "TextCutVideo", bizId }, "running");

            try {
                let files: string[];
                if (jobResult.Edit.exportMode === "merge") {
                    const file = await textCutVideoMerge(
                        modelConfig.video,
                        jobResult.Edit.records,
                    );
                    files = [await $mapi.file.hubSave(file)];
                } else {
                    const rawFiles = await textCutVideoSeparate(
                        modelConfig.video,
                        jobResult.Edit.records,
                    );
                    files = [];
                    for (const f of rawFiles) {
                        files.push(await $mapi.file.hubSave(f));
                    }
                }
                jobResult.Export.files = files;
                jobResult.step = "End";
                jobResult.Export.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("TextCutVideo export error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            return "success";
        }

        throw `TextCutVideo.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: TextCutVideoJobResultType = record.jobResult;
        if (jobResult.step === "Edit") {
            await TaskService.update(bizId, {
                status: "pause",
                statusMsg: t("msg.taskNotCompleteConfirmSegments"),
            });
        } else if (jobResult.step === "End") {
            await TaskService.update(bizId, {
                status: "success",
                endTime: Date.now(),
                result: {
                    url: await $mapi.file.hubSave(jobResult.Export.files[0]),
                },
            });
        } else {
            $mapi.log.error(
                "TextCutVideo.successFunc: unknown jobResult.step",
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
        console.log("TextCutVideo.update", { bizId, data, bizParam });
    },
};
