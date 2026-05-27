<script setup lang="ts">
import { ref } from "vue";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";

const formData = ref({
    speed: 5,
});

type VideoSpeedPartForm = {
    speed: number;
};

const speedPresets = [
    { label: "2x", value: 2 },
    { label: "3x", value: 3 },
    { label: "4x", value: 4 },
    { label: "5x", value: 5 },
    { label: "6x", value: 6 },
    { label: "8x", value: 8 },
    { label: "10x", value: 10 },
];
const getValue = async (): Promise<VideoSpeedPartForm | undefined> => {
    const data: any = {};
    data.speed = formData.value.speed;
    if (data.speed <= 0 || isNaN(data.speed)) {
        Dialog.tipError(t("error.validAcceleration"));
        return;
    }
    return data;
};

const setValue = (data: Partial<VideoSpeedPartForm>) => {
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
            <a-tooltip :content="$t('common.accelerationCoefficient')" mini>
                <icon-clock-circle />
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-input-number
                v-model="formData.speed"
                :min="1"
                :max="10"
                :step="0.5"
                :precision="1"
                :placeholder="$t('common.accelerationCoefficient')"
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
