import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import {
    VideoSubtitleJobResultType,
    VideoSubtitleModelConfigType,
} from "./type";
import { videoSubtitleExecute } from "./util";

import { TaskRunResult } from "../common/type";
import { createTaskRunResult } from "../common/lib";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const VideoSubtitleRun = async (data: {
    taskId: string;
    title: string;
    video: string;
    subtitle: string;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    console.log("VideoSubtitle.Run", data);
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "VideoSubtitle",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
                subtitle: data.subtitle,
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

export const VideoSubtitleCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: VideoSubtitleJobResultType = task.jobResult;
    if (jobResult.Render) {
        if (jobResult.Render.file) {
            files.push(jobResult.Render.file);
        }
    }
    return {
        files,
    };
};

export const VideoSubtitle: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        console.log("VideoSubtitle.runFunc", { bizId, bizParam });
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: VideoSubtitleModelConfigType = record.modelConfig;
        const jobResult: VideoSubtitleJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "Prepare";
        jobResult.Prepare = jobResult.Prepare || { status: "queue" };
        jobResult.Render = jobResult.Render || { status: "queue" };

        if (jobResult.step === "Prepare") {
            console.log("VideoSubtitle.Prepare", jobResult);
            jobResult.Prepare.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "VideoSubtitle", bizId }, "running");

            // 分析视频信息
            const { duration, width, height, fps } = await ffprobeVideoInfo(
                modelConfig.video,
            );
            jobResult.Prepare.duration = duration;
            jobResult.Prepare.width = width;
            jobResult.Prepare.height = height;
            jobResult.Prepare.fps = fps;

            jobResult.step = "Render";
            jobResult.Prepare.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Render") {
            console.log("VideoSubtitle.Render", jobResult);
            jobResult.Render.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });

            // 开始渲染带字幕的视频
            const ext = await $mapi.file.ext(modelConfig.video);
            const outputFile = await $mapi.file.temp(ext);

            try {
                await videoSubtitleExecute(
                    jobResult,
                    modelConfig.video,
                    modelConfig.subtitle,
                    outputFile,
                    {
                        bizId,
                    },
                );

                jobResult.Render.file = outputFile;
                jobResult.step = "End";
                jobResult.Render.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("VideoSubtitle render error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            console.log("VideoSubtitle.End", jobResult);
            return "success";
        }

        throw `VideoSubtitle.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: VideoSubtitleJobResultType = record.jobResult;

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
                "VideoSubtitle.successFunc: unknown jobResult.step",
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
        console.log("VideoSubtitle.update", { bizId, data, bizParam });
    },
};
