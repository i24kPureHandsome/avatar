import { defineAsyncComponent } from "vue";
import { t } from "../../../../lang";
import {
    NodeFunctionCall,
    NodeRunController,
    NodeRunParam,
    NodeRunResult,
} from "../../../../module/Workflow/core/type";
import { workflowRun } from "../../common/workflow";
import { SubtitleTtsRun } from "../task";
import AppIcon from "~icons/mdi/subtitles";

export default <NodeFunctionCall>{
    name: "SubtitleTts",
    title: t("task.subtitleToAudio"),
    description: t("app.subtitleTtsDesc"),
    icon: AppIcon,
    comp: defineAsyncComponent(() => import("./SubtitleTtsNode.vue")),
    inputFields: [
        {
            type: "file",
            name: "Srt",
            fileExtensions: ["srt"],
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
        console.log("SubtitleTts run", param);
        return workflowRun(
            controller,
            param,
            async () => {
                const taskRunData = {
                    taskId: param.runData?.["taskId"] || "",
                    srt: param.runInputs["Srt"],
                    title: param.node.properties?.title + "-" + param.node.id,
                    soundGenerate: param.node.properties?.data?.soundGenerate,
                };
                if (!taskRunData.srt || !taskRunData.soundGenerate) {
                    const missing: string[] = [];
                    if (!taskRunData.srt)
                        missing.push(t("app.subtitleFileLabel"));
                    if (!taskRunData.soundGenerate)
                        missing.push(t("workflow.soundGenerationService"));
                    throw t("workflow.paramErrorMissing", {
                        items: missing.join(", "),
                    });
                }
                return await SubtitleTtsRun(taskRunData);
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
            throw t("hint.inputSubtitleFileParam");
        }
    },
};
