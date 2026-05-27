import { defineAsyncComponent } from "vue";
import {
    NodeFunctionCall,
    NodeRunController,
    NodeRunParam,
    NodeRunResult,
} from "../../../../module/Workflow/core/type";
import { workflowRun } from "../../common/workflow";
import { MediaFormatConvertRun } from "../task";
import AppIcon from "~icons/mdi/transfer";

export default <NodeFunctionCall>{
    name: "MediaFormatConvert",
    title: "媒体格式转换",
    description: "转换媒体文件的格式",
    icon: AppIcon,
    comp: defineAsyncComponent(() => import("./MediaFormatConvertNode.vue")),
    inputFields: [
        {
            type: "file",
            name: "Value",
            fileExtensions: [
                "mp4",
                "mov",
                "avi",
                "mkv",
                "flv",
                "webm",
                "mp3",
                "wav",
                "aac",
                "flac",
                "ogg",
            ],
        },
    ],
    outputFields: [
        {
            type: "file",
            name: "Value",
            fileExtensions: [
                "mp4",
                "mov",
                "avi",
                "mkv",
                "webm",
                "mp3",
                "wav",
                "aac",
                "flac",
                "ogg",
            ],
        },
    ],
    async run(
        controller: NodeRunController,
        param: NodeRunParam,
    ): Promise<NodeRunResult> {
        console.log("MediaFormatConvert run", param);
        return workflowRun(
            controller,
            param,
            async () => {
                const targetFormat =
                    param.node.properties?.data?.targetFormat || "mp4";
                const videoCodec =
                    param.node.properties?.data?.videoCodec || "libx264";
                const audioCodec =
                    param.node.properties?.data?.audioCodec || "aac";
                const videoBitrate =
                    param.node.properties?.data?.videoBitrate || 0;
                const audioBitrate =
                    param.node.properties?.data?.audioBitrate || 0;
                const lossless = param.node.properties?.data?.lossless || false;

                const taskRunData = {
                    taskId: param.runData?.["taskId"] || "",
                    media: param.runInputs["Value"],
                    title: param.node.properties?.title + "-" + param.node.id,
                    targetFormat: targetFormat,
                    videoCodec: videoCodec,
                    audioCodec: audioCodec,
                    videoBitrate: videoBitrate,
                    audioBitrate: audioBitrate,
                    lossless: lossless,
                };
                if (!taskRunData.media) {
                    throw "参数错误：缺少媒体文件";
                }
                return await MediaFormatConvertRun(taskRunData);
            },
            async (result, data) => {
                result.runOutputs["Value"] = data.media;
            },
        );
    },
    async check(node) {
        if (!node.properties?.data?.targetFormat) {
            throw "请设置目标格式";
        }
        if (node.properties?.inputFields?.[0].value === "") {
            throw "请输入媒体文件参数";
        }
    },
};
