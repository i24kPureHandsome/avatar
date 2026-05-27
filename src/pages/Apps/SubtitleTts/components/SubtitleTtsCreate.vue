<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import FileSelector from "../../../../components/common/FileSelector.vue";
import { dataAutoSaveDraft } from "../../../../components/common/util";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";
import { TaskRecord, TaskService } from "../../../../service/TaskService";
import SoundGenerateForm from "../../../Video/components/SoundGenerateForm.vue";

const emit = defineEmits<{
    submitted: [];
}>();
const soundGenerateForm = ref<InstanceType<typeof SoundGenerateForm>>();
const formData = ref({
    srt: "",
});
const { clearDraft } = dataAutoSaveDraft(
    "SubtitleTtsCreate.formData",
    formData.value,
);

onMounted(() => {});

onUnmounted(() => {});

const doSubmit = async () => {
    const soundGenerateValue = await soundGenerateForm.value?.getValue();
    if (!soundGenerateValue) {
        return;
    }
    if (!formData.value.srt) {
        Dialog.tipError(t("error.pleaseSelectSubtitleFile"));
        return;
    }
    if (!(await $mapi.file.exists(formData.value.srt))) {
        Dialog.tipError(t("error.subtitleFileNotSelected"));
        return;
    }
    const taskTitle = $mapi.file.pathToName(formData.value.srt, false);
    const record: TaskRecord = {
        biz: "SubtitleTts",
        title: taskTitle,
        serverName: "",
        serverTitle: "",
        serverVersion: "",
        modelConfig: {
            srt: formData.value.srt,
            soundGenerate: soundGenerateValue,
        },
        param: {},
    };
    const id = await TaskService.submit(record);
    formData.value.srt = "";
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
                <a-tooltip :content="$t('hint.selectSrtFile')" mini>
                    <icon-file />
                </a-tooltip>
            </div>
            <div class="flex items-center gap-2">
                <FileSelector :extensions="['srt']" v-model="formData.srt" />
            </div>
        </div>
        <SoundGenerateForm ref="soundGenerateForm" />
        <div class="flex">
            <a-button class="mr-2" type="primary" @click="doSubmit">
                <i-mdi-send class="mr-2" />
                {{ $t("soundReplace.submitTask") }}
            </a-button>
        </div>
    </div>
</template>
