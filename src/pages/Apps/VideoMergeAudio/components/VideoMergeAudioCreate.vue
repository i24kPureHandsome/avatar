<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import FileSelector from "../../../../components/common/FileSelector.vue";
import { dataAutoSaveDraft } from "../../../../components/common/util";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";
import { TaskRecord, TaskService } from "../../../../service/TaskService";
import VideoMergeAudioParamForm from "./VideoMergeAudioParamForm.vue";

const emit = defineEmits<{
    submitted: [];
}>();

const paramForm = ref<InstanceType<typeof VideoMergeAudioParamForm> | null>(
    null,
);

const formData = ref({
    video: "",
    audio: "",
});

const { clearDraft } = dataAutoSaveDraft(
    "VideoMergeAudioCreate.formData",
    formData.value,
);

const doSubmit = async () => {
    const videoMergeAudioValue = await paramForm.value?.getValue();
    if (!videoMergeAudioValue) {
        return;
    }
    if (!formData.value.video) {
        Dialog.tipError(t("error.selectVideoFile"));
        return;
    }
    if (!formData.value.audio) {
        Dialog.tipError(t("error.selectAudioFile2"));
        return;
    }

    const taskTitle = $mapi.file.pathToName(formData.value.video, false);
    const record: TaskRecord = {
        biz: "VideoMergeAudio",
        title: taskTitle,
        serverName: "",
        serverTitle: "",
        serverVersion: "",
        modelConfig: {
            video: formData.value.video,
            audio: formData.value.audio,
            ...videoMergeAudioValue,
        },
        param: {},
    };
    const id = await TaskService.submit(record);
    formData.value.video = "";
    formData.value.audio = "";
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
                <a-tooltip :content="$t('common.audioFile')" mini>
                    <icon-file-audio />
                </a-tooltip>
            </div>
            <div class="flex items-center gap-2">
                <FileSelector
                    :extensions="['mp3', 'wav']"
                    v-model="formData.audio"
                />
            </div>
        </div>
        <VideoMergeAudioParamForm ref="paramForm" />
        <div class="flex">
            <a-button class="mr-2" type="primary" @click="doSubmit">
                <icon-send class="mr-2" />
                {{ $t("common.submitTask") }}
            </a-button>
        </div>
    </div>
</template>
