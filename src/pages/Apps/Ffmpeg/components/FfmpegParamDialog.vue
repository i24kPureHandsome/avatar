<script setup lang="ts">
import { nextTick, ref } from "vue";
import FfmpegParamForm from "./FfmpegParamForm.vue";

const paramForm = ref<InstanceType<typeof FfmpegParamForm>>();

const props = defineProps<{}>();

const visible = ref(false);
const emit = defineEmits<{
    update: [
        data: {
            commands: string[];
        },
    ];
}>();
const doSubmit = async () => {
    const value = await paramForm.value?.getValue();
    if (!value) {
        return;
    }
    visible.value = false;
    emit("update", {
        commands: value.commands,
    });
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
        :title="'FFmpeg设置'"
        width="800px"
        :destroyOnClose="true"
    >
        <template #footer>
            <div class="flex justify-end space-x-2">
                <a-button type="primary" @click="doSubmit">保存</a-button>
            </div>
        </template>
        <div
            v-if="visible"
            class="space-y-4 overflow-y-auto"
            style="max-height: calc(100vh - 10rem)"
        >
            <FfmpegParamForm ref="paramForm" />
        </div>
    </a-modal>
</template>
