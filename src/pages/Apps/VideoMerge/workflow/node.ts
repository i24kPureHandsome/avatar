import { defineAsyncComponent } from "vue";
import {
    NodeFunctionCall,
    NodeRunController,
    NodeRunParam,
    NodeRunResult,
} from "../../../../module/Workflow/core/type";
import { workflowRun } from "../../common/workflow";
import { VideoMergeRun } from "../task";
import AppIcon from "~icons/mdi/merge";

export default <NodeFunctionCall>{
    name: "VideoMerge",
    title: "视频合并",
    description: "将多个视频文件合并为一个视频",
    icon: AppIcon,
    comp: defineAsyncComponent(() => import("./VideoMergeNode.vue")),
    inputFields: [
        {
            type: "files",
            name: "Videos",
            fileExtensions: ["mp4", "avi", "mov", "mkv"],
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
        console.log("VideoMerge run", param);
        return workflowRun(
            controller,
            param,
            async () => {
                const transitionEffect =
                    param.node.properties?.data?.transitionEffect || "fade";
                const transitionDuration =
                    param.node.properties?.data?.transitionDuration || 500;
                const videosRaw = param.runInputs["Videos"];
                let videos: string[];
                if (typeof videosRaw === "string") {
                    try {
                        videos = JSON.parse(videosRaw);
                    } catch {
                        videos = [videosRaw];
                    }
                } else {
                    videos = videosRaw || [];
                }
                const taskRunData = {
                    taskId: param.runData?.["taskId"] || "",
                    videos: videos,
                    title: param.node.properties?.title + "-" + param.node.id,
                    transitionEffect: transitionEffect,
                    transitionDuration: transitionDuration,
                };
                if (!taskRunData.videos || taskRunData.videos.length < 2) {
                    throw "至少需要2个视频文件";
                }
                return await VideoMergeRun(taskRunData);
            },
            async (result, data) => {
                result.runOutputs["Video"] = data.video;
            },
        );
    },
    async check(node) {
        if (!node.properties?.data?.transitionEffect) {
            throw "请输入转场特效";
        }
        if (node.properties?.inputFields?.[0].value === "") {
            throw "请输入视频参数";
        }
    },
};
