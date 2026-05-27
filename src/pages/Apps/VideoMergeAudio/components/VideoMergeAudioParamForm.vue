<script setup lang="ts">
import { ref } from "vue";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";

const formData = ref({
    volume: 50,
    loopAudio: true,
    fadeInTime: 3000,
    fadeOutTime: 2000,
});

type VideoMergeAudioForm = {
    volume: number;
    loopAudio: boolean;
    fadeInTime: number;
    fadeOutTime: number;
};

const volumePresets = [
    { label: "10%", value: 10 },
    { label: "20%", value: 20 },
    { label: "30%", value: 30 },
    { label: "40%", value: 40 },
    { label: "50%", value: 50 },
    { label: "75%", value: 75 },
    { label: "100%", value: 100 },
    { label: "200%", value: 200 },
    { label: "500%", value: 500 },
];
const getValue = async (): Promise<VideoMergeAudioForm | undefined> => {
    const data: any = {};
    data.volume = formData.value.volume;
    data.loopAudio = formData.value.loopAudio;
    data.fadeInTime = formData.value.fadeInTime;
    data.fadeOutTime = formData.value.fadeOutTime;
    if (data.volume <= 0 || isNaN(data.volume)) {
        Dialog.tipError(t("error.validAudioVolume"));
        return;
    }
    if (data.fadeInTime < 0 || isNaN(data.fadeInTime)) {
        Dialog.tipError(t("error.validFadeInTime"));
        return;
    }
    if (data.fadeOutTime < 0 || isNaN(data.fadeOutTime)) {
        Dialog.tipError(t("error.validFadeOutTime"));
        return;
    }
    return data;
};

const setValue = (data: Partial<VideoMergeAudioForm>) => {
    console.log("setValue", data);
    if (data.volume !== undefined) {
        formData.value.volume = data.volume;
    }
    if (data.loopAudio !== undefined) {
        formData.value.loopAudio = data.loopAudio;
    }
    if (data.fadeInTime !== undefined) {
        formData.value.fadeInTime = data.fadeInTime;
    }
    if (data.fadeOutTime !== undefined) {
        formData.value.fadeOutTime = data.fadeOutTime;
    }
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-32">
            <a-tooltip :content="$t('common.volume')" mini>
                <icon-sound />
                {{ $t("common.volume") }}
            </a-tooltip>
        </div>
        <div class="flex-grow gap-2">
            <div>
                <a-slider
                    v-model="formData.volume"
                    :min="1"
                    :max="500"
                    :step="1"
                    :style="{ width: '200px' }"
                />
            </div>
            <div class="flex gap-1">
                <a-button
                    v-for="preset in volumePresets"
                    :key="preset.value"
                    size="mini"
                    class="px-1"
                    :type="
                        formData.volume === preset.value ? 'primary' : 'outline'
                    "
                    @click="formData.volume = preset.value"
                >
                    {{ preset.label }}
                </a-button>
            </div>
        </div>
    </div>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-32">
            <a-tooltip :content="$t('common.loopAudio')" mini>
                <icon-loop />
                {{ $t("common.loopAudio") }}
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-switch v-model="formData.loopAudio" />
        </div>
    </div>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-32">
            <a-tooltip :content="$t('common.fadeIn')" mini>
                <icon-arrow-up />
                {{ $t("common.fadeIn") }} (ms)
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-input-number
                v-model="formData.fadeInTime"
                :min="0"
                :step="100"
                :precision="0"
                style="width: 120px"
            />
        </div>
    </div>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-32">
            <a-tooltip :content="$t('common.fadeOut')" mini>
                <icon-arrow-down />
                {{ $t("common.fadeOut") }} (ms)
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-input-number
                v-model="formData.fadeOutTime"
                :min="0"
                :step="100"
                :precision="0"
                style="width: 120px"
            />
        </div>
    </div>
</template>
