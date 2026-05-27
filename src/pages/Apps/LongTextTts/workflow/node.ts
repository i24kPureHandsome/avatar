import { defineAsyncComponent } from "vue";
import { t } from "../../../../lang";
import {
    NodeFunctionCall,
    NodeRunController,
    NodeRunParam,
    NodeRunResult,
} from "../../../../module/Workflow/core/type";
import { workflowRun } from "../../common/workflow";
import { LongTextTtsRun } from "../task";
import AppIcon from "~icons/mdi/waveform";

export default <NodeFunctionCall>{
    name: "LongTextTts",
    title: t("app.longTextTts"),
    description: t("app.longTextTtsDesc"),
    icon: AppIcon,
    comp: defineAsyncComponent(() => import("./LongTextTtsNode.vue")),
    inputFields: [
        {
            type: "text",
            name: "Text",
        },
    ],
    outputFields: [
        {
            type: "file",
            name: "Audio",
            fileExtensions: ["mp3", "wav"],
        },
    ],
    async run(
        controller: NodeRunController,
        param: NodeRunParam,
    ): Promise<NodeRunResult> {
        console.log("LongTextTts run", param);
        return workflowRun(
            controller,
            param,
            async () => {
                const taskRunData = {
                    taskId: param.runData?.["taskId"] || "",
                    text: param.runInputs["Text"],
                    title: param.node.properties?.title + "-" + param.node.id,
                    soundGenerate: param.node.properties?.data?.soundGenerate,
                };
                if (!taskRunData.text || !taskRunData.soundGenerate) {
                    const missing: string[] = [];
                    if (!taskRunData.text) missing.push(t("app.longTextLabel"));
                    if (!taskRunData.soundGenerate)
                        missing.push(t("workflow.soundGenerationService"));
                    throw t("workflow.paramErrorMissing", {
                        items: missing.join(", "),
                    });
                }
                return await LongTextTtsRun(taskRunData);
            },
            async (result, data) => {
                result.runOutputs["Audio"] = data.audio;
            },
        );
    },
    async check(node) {
        if (!node.properties?.data?.soundGenerate) {
            throw t("hint.configureSoundGenerateService");
        }
        if (node.properties?.inputFields?.[0].value === "") {
            throw t("app.inputLongText");
        }
    },
};
