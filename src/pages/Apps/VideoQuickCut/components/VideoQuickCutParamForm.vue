<script setup lang="ts">
import { ref } from "vue";
import SoundAsrForm from "../../../Video/components/SoundAsrForm.vue";

const soundAsrForm = ref<InstanceType<typeof SoundAsrForm>>();

type VideoQuickCutForm = {
    soundAsr: SoundAsrParamType;
};

const getValue = async (): Promise<VideoQuickCutForm | undefined> => {
    const data: any = {};
    data.soundAsr = await soundAsrForm.value?.getValue();
    if (!data.soundAsr) {
        return;
    }
    return data;
};

const setValue = (data: Partial<VideoQuickCutForm>) => {
    if (data.soundAsr !== undefined) {
        soundAsrForm.value?.setValue(data.soundAsr);
    }
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <SoundAsrForm ref="soundAsrForm" />
</template>
