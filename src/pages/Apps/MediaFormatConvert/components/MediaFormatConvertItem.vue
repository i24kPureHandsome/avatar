<script setup lang="ts">
import TaskCancelAction from "../../../../components/Server/TaskCancelAction.vue";
import TaskContinueAction from "../../../../components/Server/TaskContinueAction.vue";
import TaskDeleteAction from "../../../../components/Server/TaskDeleteAction.vue";
import TaskDownloadAction from "../../../../components/Server/TaskDownloadAction.vue";
import TaskDuration from "../../../../components/Server/TaskDuration.vue";
import TaskPercent from "../../../../components/Server/TaskPercent.vue";
import TaskTitleField from "../../../../components/Server/TaskTitleField.vue";
import TaskBizStatus from "../../../../components/common/TaskBizStatus.vue";
import TaskJobResultStepView from "../../../../components/common/TaskJobResultStepView.vue";
import VideoPreviewBox from "../../../../components/common/VideoPreviewBox.vue";
import { TaskRecord } from "../../../../service/TaskService";
import VideoInfo from "../../common/VideoInfo.vue";
import {
    MediaFormatConvertJobResultType,
    MediaFormatConvertModelConfigType,
} from "../type";
import MediaFormatConvertParamView from "./MediaFormatConvertParamView.vue";

const props = defineProps<{
    record: TaskRecord<
        MediaFormatConvertModelConfigType,
        MediaFormatConvertJobResultType
    >;
    dialog: boolean;
    onRefresh: () => void;
}>();

const getFormatInfo = (): { label: string; value: string }[] => {
    const config = props.record.modelConfig;
    if (!config) return [];

    const info: { label: string; value: string }[] = [];

    // 目标格式
    info.push({
        label: "目标格式",
        value: config.targetFormat.toUpperCase(),
    });

    // 视频编码
    if (config.videoCodec && !config.lossless) {
        let codecName = config.videoCodec;
        if (codecName === "libx264") codecName = "H.264";
        if (codecName === "libx265") codecName = "H.265/HEVC";
        if (codecName === "libvpx-vp9") codecName = "VP9";

        info.push({
            label: "视频编码",
            value: codecName,
        });

        // 视频比特率
        if (config.videoBitrate > 0) {
            info.push({
                label: "视频比特率",
                value: `${config.videoBitrate} kbps`,
            });
        }
    }

    // 音频编码
    if (config.audioCodec && !config.lossless) {
        let codecName = config.audioCodec;
        if (codecName === "aac") codecName = "AAC";
        if (codecName === "libmp3lame") codecName = "MP3";
        if (codecName === "libopus") codecName = "Opus";
        if (codecName === "pcm_s16le") codecName = "PCM";
        if (codecName === "flac") codecName = "FLAC";

        info.push({
            label: "音频编码",
            value: codecName,
        });

        // 音频比特率
        if (config.audioBitrate > 0) {
            info.push({
                label: "音频比特率",
                value: `${config.audioBitrate} kbps`,
            });
        }
    }

    // 无损转换
    info.push({
        label: "转换模式",
        value: config.lossless ? "无损转换" : "有损转换",
    });

    return info;
};
</script>

<template>
    <div class="rounded-xl shadow border p-4 mb-4 hover:shadow-lg">
        <div class="flex items-center gap-1">
            <div
                class="inline-flex items-start bg-blue-100 rounded-full px-2 leading-8 h-8 mr-2"
            >
                <div v-if="!dialog" class="mr-2 h-8 pt-0.5">
                    <a-checkbox v-model="record['_check']" />
                </div>
                <div class="">
                    <TaskTitleField
                        :record="record"
                        :disabled="dialog"
                        @title-click="record['_check'] = !record['_check']"
                        @update="(v) => (record.title = v)"
                    />
                </div>
            </div>
            <div class="flex-grow"></div>
            <TaskPercent
                v-if="record.status === 'running'"
                :percent="record.result?.percent"
            />
            <TaskDuration :start="record.startTime" :end="record.endTime" />
            <TaskBizStatus
                :status="record.status"
                :status-msg="record.statusMsg"
            />
        </div>
        <div class="mt-3 flex items-center">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-file />
                    解析媒体
                </div>
            </div>
            <div class="flex-grow">
                <TaskJobResultStepView :record="record" step="Prepare">
                    <div class="flex flex-wrap gap-1">
                        <template v-if="record.jobResult?.Prepare.isVideo">
                            <VideoInfo :data="record.jobResult?.Prepare" />
                        </template>
                        <template v-else>
                            <a-tag class="rounded-lg"
                                >时长
                                {{
                                    record.jobResult?.Prepare.duration?.toFixed(
                                        1,
                                    )
                                }}秒
                            </a-tag>
                            <a-tag
                                v-if="record.jobResult?.Prepare.audioChannels"
                                class="rounded-lg"
                                >声道数
                                {{ record.jobResult?.Prepare.audioChannels }}
                            </a-tag>
                            <a-tag
                                v-if="record.jobResult?.Prepare.audioSampleRate"
                                class="rounded-lg"
                                >采样率
                                {{ record.jobResult?.Prepare.audioSampleRate }}
                                Hz
                            </a-tag>
                        </template>
                    </div>
                </TaskJobResultStepView>
            </div>
        </div>
        <div class="mt-3 flex items-center">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-settings />
                    格式配置
                </div>
            </div>
            <div class="flex-grow">
                <TaskJobResultStepView :record="record" step="Config">
                    <div class="flex items-center gap-1 mb-2">
                        <MediaFormatConvertParamView
                            :data="record.modelConfig!"
                        />
                    </div>
                </TaskJobResultStepView>
            </div>
        </div>
        <div class="mt-3 flex">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-swap />
                    格式转换
                </div>
            </div>
            <TaskJobResultStepView :record="record" step="Convert">
                <div>
                    <template v-if="record.jobResult?.Prepare.isVideo">
                        <VideoPreviewBox
                            :url="record.jobResult?.Convert.file"
                        />
                    </template>
                    <template v-else>
                        <div class="flex items-center">
                            <icon-sound class="text-2xl mr-2" />
                            <span>音频文件已转换完成</span>
                        </div>
                    </template>
                </div>
            </TaskJobResultStepView>
        </div>
        <div class="pt-4 flex items-center">
            <div class="text-gray-400 text-xs mr-2">#{{ record.id }}</div>
            <div class="text-gray-400 flex-grow">
                <timeago :datetime="record['createdAt'] * 1000" />
            </div>
            <div class="">
                <TaskDownloadAction :record="record" />
                <TaskDeleteAction
                    v-if="!dialog"
                    :record="record"
                    @update="onRefresh"
                />
                <TaskContinueAction :record="record" @update="onRefresh" />
                <TaskCancelAction :record="record" />
            </div>
        </div>
    </div>
</template>
