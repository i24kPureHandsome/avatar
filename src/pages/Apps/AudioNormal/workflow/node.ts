import { defineAsyncComponent } from "vue";
import {
    NodeFunctionCall,
    NodeRunController,
    NodeRunParam,
    NodeRunResult,
} from "../../../../module/Workflow/core/type";
import { workflowRun } from "../../common/workflow";
import { AudioNormalRun } from "../task";
import AppIcon from "~icons/mdi/volume-high";

export default <NodeFunctionCall>{
    name: "AudioNormal",
    title: "声音归一化",
    description: "对视频或音频进行声音归一化处理",
    icon: AppIcon,
    comp: defineAsyncComponent(() => import("./AudioNormalNode.vue")),
    inputFields: [
        {
            type: "file",
            name: "File",
            fileExtensions: ["mp4", "avi", "mov", "mp3", "wav", "flac"],
        },
    ],
    outputFields: [
        {
            type: "file",
            name: "File",
            fileExtensions: ["mp4", "mp3"],
        },
    ],
    async run(
        controller: NodeRunController,
        param: NodeRunParam,
    ): Promise<NodeRunResult> {
        console.log("AudioNormal run", param);
        return workflowRun(
            controller,
            param,
            async () => {
                const normalizationPercentage =
                    param.node.properties?.data?.normalizationPercentage || 100;
                const taskRunData = {
                    taskId: param.runData?.["taskId"] || "",
                    file: param.runInputs["File"],
                    title: param.node.properties?.title + "-" + param.node.id,
                    normalizationPercentage: normalizationPercentage,
                };
                if (!taskRunData.file) {
                    throw "文件参数错误";
                }
                return await AudioNormalRun(taskRunData);
            },
            async (result, data) => {
                result.runOutputs["File"] = data.file;
            },
        );
    },
    async check(node) {
        if (!node.properties?.data?.normalizationPercentage) {
            throw "请输入归一化程度参数";
        }
        if (node.properties?.inputFields?.[0].value === "") {
            throw "请输入文件参数";
        }
    },
};
