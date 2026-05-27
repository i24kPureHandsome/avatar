<script setup lang="ts">
import { nextTick, ref } from "vue";
import VideoMergeImageParamForm from "./VideoMergeImageParamForm.vue";

const paramForm = ref<InstanceType<typeof VideoMergeImageParamForm>>();

const props = defineProps<{}>();

const visible = ref(false);
const emit = defineEmits<{
    update: [
        data: {
            position: "start" | "end";
            duration: number;
            animation: "none" | "zoom";
            zoomPercent?: number;
        },
    ];
}>();
const doSubmit = async () => {
    const value = await paramForm.value?.getValue();
    if (!value) {
        return;
    }
    visible.value = false;
    emit("update", value);
};

defineExpose({
    show: (data?: any) => {
        visible.value = true;
        nextTick(() => {
            if (data) {
                paramForm.value?.setValue(data);
            }
        });
    },
});
</script>

<template>
    <a-modal
        v-model:visible="visible"
        title-align="start"
        :title="
            $t('common.positionStart') +
            '/' +
            $t('common.positionEnd') +
            $t('common.setting')
        "
        width="800px"
        :destroyOnClose="true"
    >
        <template #footer>
            <div class="flex justify-end space-x-2">
                <a-button type="primary" @click="doSubmit">{{
                    $t("common.save")
                }}</a-button>
            </div>
        </template>
        <div
            v-if="visible"
            class="space-y-4 overflow-y-auto"
            style="max-height: calc(100vh - 10rem)"
        >
            <VideoMergeImageParamForm ref="paramForm" />
        </div>
    </a-modal>
</template>
