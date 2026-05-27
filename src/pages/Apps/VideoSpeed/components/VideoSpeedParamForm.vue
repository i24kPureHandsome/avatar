<script setup lang="ts">
import { ref } from "vue";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";

const formData = ref({
    speed: 1.0,
});

type VideoSpeedForm = {
    speed: number;
};

const speedPresets = [
    { label: "0.25x", value: 0.25 },
    { label: "0.5x", value: 0.5 },
    { label: "0.75x", value: 0.75 },
    { label: "1x", value: 1.0 },
    { label: "1.25x", value: 1.25 },
    { label: "1.5x", value: 1.5 },
    { label: "2x", value: 2.0 },
    { label: "3x", value: 3.0 },
];
const getValue = async (): Promise<VideoSpeedForm | undefined> => {
    const data: any = {};
    data.speed = formData.value.speed;
    if (data.speed <= 0 || isNaN(data.speed)) {
        Dialog.tipError(t("error.validPlaybackSpeed"));
        return;
    }
    return data;
};

const setValue = (data: Partial<VideoSpeedForm>) => {
    if (data.speed !== undefined) {
        formData.value.speed = data.speed;
    }
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-5">
            <a-tooltip :content="$t('common.playbackSpeed')" mini>
                <icon-clock-circle />
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-input-number
                v-model="formData.speed"
                :min="0.1"
                :max="10"
                :step="0.1"
                :precision="2"
                :placeholder="$t('common.customSpeed')"
                style="width: 120px"
            />
            <div class="flex gap-1">
                <a-button
                    v-for="preset in speedPresets"
                    :key="preset.value"
                    size="small"
                    class="px-1"
                    :type="
                        formData.speed === preset.value ? 'primary' : 'outline'
                    "
                    @click="formData.speed = preset.value"
                >
                    {{ preset.label }}
                </a-button>
            </div>
        </div>
    </div>
</template>
