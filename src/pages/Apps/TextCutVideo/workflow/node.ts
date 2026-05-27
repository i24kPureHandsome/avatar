import { defineAsyncComponent } from "vue";
import AppIcon from "~icons/mdi/text-box-search";
import { t } from "../../../../lang";
import {
    NodeFunctionCall,
    NodeRunController,
    NodeRunParam,
    NodeRunResult,
} from "../../../../module/Workflow/core/type";
import { workflowRun } from "../../common/workflow";
import { TextCutVideoRun } from "../task";

export default <NodeFunctionCall>{
    name: "TextCutVideo",
    title: "文本剪辑视频",
    description: "通过文字内容剪辑视频",
    icon: AppIcon,
    comp: defineAsyncComponent(() => import("./TextCutVideoNode.vue")),
    inputFields: [
        {
            type: "file",
            name: "Video",
            fileExtensions: ["mp4"],
        },
    ],
    outputFields: [
        {
            type: "file",
            name: "Video",
            fileExtensions: ["mp4"],
        },
    ],
    async run(
        controller: NodeRunController,
        param: NodeRunParam,
    ): Promise<NodeRunResult> {
        return workflowRun(
            controller,
            param,
            async () => {
                const soundAsr = param.node.properties?.data?.soundAsr;
                const taskRunData = {
                    taskId: param.runData?.["taskId"] || "",
                    video: param.runInputs["Video"],
                    title: param.node.properties?.title + "-" + param.node.id,
                    soundAsr: soundAsr,
                };
                if (!taskRunData.video) {
                    throw t("error.missingVideoFile");
                }
                if (!taskRunData.soundAsr) {
                    throw t("error.configureSpeechRecognition");
                }
                return await TextCutVideoRun(taskRunData);
            },
            async (result, data) => {
                result.runOutputs["Video"] = data.video;
            },
        );
    },
    async check(node) {
        if (!node.properties?.data?.soundAsr) {
            throw t("error.configureSpeechRecognition");
        }
        if (node.properties?.inputFields?.[0].value === "") {
            throw t("error.inputVideoParam");
        }
    },
};
