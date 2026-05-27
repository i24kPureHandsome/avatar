import { defineAsyncComponent } from "vue";
import { t } from "../../../../lang";
import {
    NodeFunctionCall,
    NodeRunController,
    NodeRunParam,
    NodeRunResult,
} from "../../../../module/Workflow/core/type";
import { workflowRun } from "../../common/workflow";
import { ImageToImageRun } from "../task";
import AppIcon from "~icons/mdi/image-filter-none";

export default <NodeFunctionCall>{
    name: "ImageToImage",
    title: t("model.img2img"),
    description: t("app.imageToImageDesc"),
    icon: AppIcon,
    comp: defineAsyncComponent(() => import("./ImageToImageNode.vue")),
    inputFields: [
        {
            type: "file",
            name: "Image",
            fileExtensions: ["png", "jpg", "jpeg"],
        },
        {
            type: "text",
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
        console.log("ImageToImage run", param);
        return workflowRun(
            controller,
            param,
            async () => {
                const taskRunData = {
                    taskId: param.runData?.["taskId"] || "",
                    image: param.runInputs["Image"],
                    prompt: param.runInputs["Prompt"],
                    title: param.node.properties?.title + "-" + param.node.id,
                    imageToImage: param.node.properties?.data?.imageToImage,
                };
                if (
                    !taskRunData.image ||
                    !taskRunData.prompt ||
                    !taskRunData.imageToImage
                ) {
                    const missing: string[] = [];
                    if (!taskRunData.image) missing.push(t("app.imageLabel"));
                    if (!taskRunData.prompt) missing.push(t("app.promptText"));
                    if (!taskRunData.imageToImage)
                        missing.push(t("app.imageGenerateService"));
                    throw t("workflow.paramErrorMissing", {
                        items: missing.join(", "),
                    });
                }
                return await ImageToImageRun(taskRunData);
            },
            async (result, data) => {
                result.runOutputs["Image"] = data.image;
            },
        );
    },
    async check(node) {
        if (!node.properties?.data?.imageToImage) {
            throw t("hint.configureImageGenerateService");
        }
        if (node.properties?.inputFields?.[0].value === "") {
            throw t("hint.inputImageParam");
        }
        if (node.properties?.inputFields?.[1].value === "") {
            throw t("hint.inputPromptParam");
        }
    },
};
