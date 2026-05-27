import { defineAsyncComponent } from "vue";
import { t } from "../../../../lang";
import {
    NodeFunctionCall,
    NodeRunController,
    NodeRunParam,
    NodeRunResult,
} from "../../../../module/Workflow/core/type";
import { workflowRun } from "../../common/workflow";
import { TextToImageRun } from "../task";
import AppIcon from "~icons/mdi/image-text";

export default <NodeFunctionCall>{
    name: "TextToImage",
    title: t("model.txt2img"),
    description: t("app.textToImageDesc"),
    icon: AppIcon,
    comp: defineAsyncComponent(() => import("./TextToImageNode.vue")),
    inputFields: [
        {
            type: "textarea",
            name: "Prompt",
        },
    ],
    outputFields: [
        {
            type: "file",
            name: "Image",
            fileExtensions: ["png", "jpg"],
        },
    ],
    async run(
        controller: NodeRunController,
        param: NodeRunParam,
    ): Promise<NodeRunResult> {
        console.log("TextToImage run", param);
        return workflowRun(
            controller,
            param,
            async () => {
                const taskRunData = {
                    taskId: param.runData?.["taskId"] || "",
                    prompt: param.runInputs["Prompt"],
                    title: param.node.properties?.title + "-" + param.node.id,
                    textToImage: param.node.properties?.data?.textToImage,
                };
                if (!taskRunData.prompt || !taskRunData.textToImage) {
                    const missing: string[] = [];
                    if (!taskRunData.prompt) missing.push(t("app.promptText"));
                    if (!taskRunData.textToImage)
                        missing.push(t("app.imageGenerateService"));
                    throw t("workflow.paramErrorMissing", {
                        items: missing.join(", "),
                    });
                }
                return await TextToImageRun(taskRunData);
            },
            async (result, data) => {
                result.runOutputs["Image"] = data.image;
            },
        );
    },
    async check(node) {
        if (!node.properties?.data?.textToImage) {
            throw t("hint.configureImageGenerateService");
        }
        if (node.properties?.inputFields?.[0].value === "") {
            throw t("hint.inputTextParam");
        }
    },
};
