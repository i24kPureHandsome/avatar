<script setup lang="ts">
import { ref } from "vue";
import TaskCancelAction from "../../../../components/Server/TaskCancelAction.vue";
import TaskContinueAction from "../../../../components/Server/TaskContinueAction.vue";
import TaskDeleteAction from "../../../../components/Server/TaskDeleteAction.vue";
import TaskDownloadAction from "../../../../components/Server/TaskDownloadAction.vue";
import TaskDuration from "../../../../components/Server/TaskDuration.vue";
import TaskTitleField from "../../../../components/Server/TaskTitleField.vue";
import TaskBizStatus from "../../../../components/common/TaskBizStatus.vue";
import TaskJobResultStepView from "../../../../components/common/TaskJobResultStepView.vue";
import { TaskRecord, TaskService } from "../../../../service/TaskService";
import { useTaskStore } from "../../../../store/modules/task";
import VideoInfo from "../../common/VideoInfo.vue";
import {
    TextCutVideoJobResultType,
    TextCutVideoModelConfigType,
    TextCutVideoSegment,
} from "../type";
import TextCutVideoEditDialog from "./TextCutVideoEditDialog.vue";
import VideoPreviewBox from "../../../../components/common/VideoPreviewBox.vue";

const props = defineProps<{
    record: TaskRecord<
        TextCutVideoModelConfigType,
        TextCutVideoJobResultType
    >;
    dialog: boolean;
    onRefresh: () => void;
}>();
const taskStore = useTaskStore();

const textCutVideoEditDialog = ref<InstanceType<
    typeof TextCutVideoEditDialog
> | null>(null);

const onEdit = async (
    taskId: number,
    records: TextCutVideoSegment[],
    exportMode: "merge" | "separate",
) => {
    await TaskService.update(taskId, {
        statusMsg: "",
        jobResult: {
            step: "Export",
            Edit: { records, exportMode },
        },
    });
    await taskStore.dispatch("TextCutVideo", taskId + "");
    props.onRefresh();
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
            <TaskDuration :start="record.startTime" :end="record.endTime" />
            <TaskBizStatus
                :status="record.status"
                :status-msg="record.statusMsg"
            />
        </div>
        <div class="mt-3 flex items-center">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-video-camera />
                    {{ $t("common.convertAudio") }}
                </div>
            </div>
            <div class="flex-grow">
                <TaskJobResultStepView :record="record" step="ToAudio">
                    <div class="flex gap-1">
                        <VideoInfo :data="record.jobResult?.ToAudio! as any" />
                    </div>
                </TaskJobResultStepView>
            </div>
        </div>
        <div class="mt-3 flex items-center">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-sound />
                    {{ $t("common.speechRecognition") }}
                </div>
            </div>
            <div class="flex-grow">
                <TaskJobResultStepView :record="record" step="Asr">
                    <div>
                        <a-tag class="rounded-lg">
                            {{
                                $t("common.recognizedSegments", {
                                    count: (record.jobResult?.Asr.records || [])
                                        .length,
                                })
                            }}
                        </a-tag>
                    </div>
                </TaskJobResultStepView>
            </div>
        </div>
        <div class="mt-3 flex items-center">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-edit />
                    {{ $t("common.textEdit") }}
                </div>
            </div>
            <div class="flex-grow">
                <TaskJobResultStepView :record="record" step="Edit">
                    <template #successPending>
                        <div class="mb-1">
                            <a-button
                                type="primary"
                                @click="
                                    textCutVideoEditDialog?.edit(
                                        record.id!,
                                        record.modelConfig!.video!,
                                        Math.floor(
                                            record.jobResult?.ToAudio!
                                                .duration! * 1000,
                                        ),
                                        record.jobResult?.Edit!.records!,
                                        record.jobResult?.Edit!.exportMode ||
                                            'merge',
                                    )
                                "
                            >
                                <template #icon>
                                    <icon-pen />
                                </template>
                                {{ $t("common.editTextSegments") }}
                            </a-button>
                        </div>
                    </template>
                </TaskJobResultStepView>
            </div>
        </div>
        <div class="mt-3 flex">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-video-camera />
                    {{ $t("common.videoExport") }}
                </div>
            </div>
            <TaskJobResultStepView :record="record" step="Export">
                <div>
                    <div
                        v-if="
                            record.jobResult?.Edit?.exportMode === 'separate'
                        "
                        class="space-y-1"
                    >
                        <div
                            v-for="(file, index) in record.jobResult?.Export
                                ?.files"
                            :key="index"
                            class="flex items-center gap-2"
                        >
                            <VideoPreviewBox :url="file" />
                            <a-button
                                size="mini"
                                @click="$mapi.file.openPath(file)"
                            >
                                <icon-download />
                            </a-button>
                            <span class="text-xs text-gray-500">
                                {{ $t("common.segment") }} {{ index + 1 }}
                            </span>
                        </div>
                    </div>
                    <div v-else>
                        <VideoPreviewBox
                            :url="record.jobResult?.Export?.files?.[0]!"
                        />
                    </div>
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
    <TextCutVideoEditDialog
        ref="textCutVideoEditDialog"
        :save-title="$t('common.saveModify')"
        @save="onEdit"
    />
</template>
