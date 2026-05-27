<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { dataAutoSaveDraft } from "../../../../components/common/util";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";
import { TaskRecord, TaskService } from "../../../../service/TaskService";
import FileSelector from "../../../../components/common/FileSelector.vue";

const emit = defineEmits<{
    submitted: [];
}>();
const formData = ref({
    video: "",
    subtitle: "",
});

const { clearDraft } = dataAutoSaveDraft(
    "VideoSubtitleCreate.formData",
    formData.value,
);

const doSubmit = async () => {
    if (!formData.value.video) {
        Dialog.tipError(t("error.selectVideoFile"));
        return;
    }
    if (!formData.value.subtitle) {
        Dialog.tipError(t("error.selectSubtitleFile"));
        return;
    }

    const taskTitle = $mapi.file.pathToName(formData.value.video, false);
    const record: TaskRecord = {
        biz: "VideoSubtitle",
        title: taskTitle,
        serverName: "",
        serverTitle: "",
        serverVersion: "",
        modelConfig: {
            video: formData.value.video,
            subtitle: formData.value.subtitle,
        },
        param: {},
    };
    const id = await TaskService.submit(record);
    formData.value.video = "";
    formData.value.subtitle = "";
    emit("submitted");
    Dialog.tipSuccess(t("common.taskSubmitted"));
    clearDraft();
    return id;
};
</script>

<template>
    <div class="rounded-xl shadow border p-4">
        <div class="mb-4 flex items-start">
            <div class="pt-1 w-5">
                <a-tooltip :content="$t('common.videoFile')" mini>
                    <icon-video-camera />
                </a-tooltip>
            </div>
            <div class="flex items-center gap-2">
                <FileSelector :extensions="['mp4']" v-model="formData.video" />
            </div>
        </div>
        <div class="mb-4 flex items-start">
            <div class="pt-1 w-5">
                <a-tooltip :content="$t('common.subtitleFile')" mini>
                    <icon-file />
                </a-tooltip>
            </div>
            <div class="flex items-center gap-2">
                <FileSelector
                    :extensions="['srt']"
                    v-model="formData.subtitle"
                />
            </div>
        </div>
        <div class="flex">
            <a-button class="mr-2" type="primary" @click="doSubmit">
                <icon-send class="mr-2" />
                {{ $t("common.submitTask") }}
            </a-button>
        </div>
    </div>
</template>
