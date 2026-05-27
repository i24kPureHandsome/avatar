import { defineAsyncComponent } from "vue";
import {
    NodeFunctionCall,
    NodeRunController,
    NodeRunParam,
    NodeRunResult,
} from "../../../../module/Workflow/core/type";
import { workflowRun } from "../../common/workflow";
import { VideoKeepPartRun } from "../task";
import AppIcon from "~icons/mdi/scissors-cutting";

export default <NodeFunctionCall>{
    name: "VideoKeepPart",
    title: "视频片段删除/保留",
    description: "保留视频的指定片段",
    icon: AppIcon,
    comp: defineAsyncComponent(() => import("./VideoKeepPartNode.vue")),
    inputFields: [
        {
            type: "file",
            name: "Video",
            placeholder: "选择视频文件",
            fileExtensions: ["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm"],
        },
    ],
    outputFields: [
        {
            type: "file",
            name: "Video",
            placeholder: "处理后的视频文件",
        },
    ],
    async run(
        controller: NodeRunController,
        param: NodeRunParam,
    ): Promise<NodeRunResult> {
        console.log("VideoKeepPart run", param);
        return workflowRun(
            controller,
            param,
            async () => {
                const action = param.node.properties?.data?.action || "remove";
                const taskRunData = {
                    taskId: param.runData?.["taskId"] || "",
                    video: param.runInputs["Video"],
                    title: param.node.properties?.title + "-" + param.node.id,
                    action: action,
                };
                if (!taskRunData.video) {
                    throw "请选择视频文件";
                }
                return await VideoKeepPartRun(taskRunData);
            },
            async (result, data) => {
                result.runOutputs["Video"] = data.video;
            },
        );
    },
    async check(node) {
        if (!node.properties?.data?.action) {
            throw new Error("请选择操作类型");
        }
        if (node.properties?.inputFields?.[0].value === "") {
            throw new Error("请选择视频文件");
        }
    },
};
