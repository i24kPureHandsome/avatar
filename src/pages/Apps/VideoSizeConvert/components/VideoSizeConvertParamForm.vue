<script setup lang="ts">
import { onMounted, ref } from "vue";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";

const formData = ref({
    targetWidth: 1920,
    targetHeight: 1080,
    fillMode: "black" as "blur" | "black" | "crop" | "stretch",
});

type VideoSizeConvertForm = {
    targetWidth: number;
    targetHeight: number;
    fillMode: "blur" | "black" | "crop" | "stretch";
};

const sizePresets = [
    { label: "4K (3840x2160)", width: 3840, height: 2160 },
    { label: "4K竖屏 (2160x3840)", width: 2160, height: 3840 },
    { label: "1440P (2560x1440)", width: 2560, height: 1440 },
    { label: "1440P竖屏 (1440x2560)", width: 1440, height: 2560 },
    { label: "1080P (1920x1080)", width: 1920, height: 1080 },
    { label: "1080P竖屏 (1080x1920)", width: 1080, height: 1920 },
    { label: "720P (1280x720)", width: 1280, height: 720 },
    { label: "720P竖屏 (720x1280)", width: 720, height: 1280 },
    { label: "480P (854x480)", width: 854, height: 480 },
    { label: "480P竖屏 (480x854)", width: 480, height: 854 },
    { label: "方形1080 (1080x1080)", width: 1080, height: 1080 },
    { label: "方形720 (720x720)", width: 720, height: 720 },
    { label: "方形480 (480x480)", width: 480, height: 480 },
];

const selectedPreset = ref<string>("");

const updatePreset = () => {
    const preset = sizePresets.find(
        (p) =>
            p.width === formData.value.targetWidth &&
            p.height === formData.value.targetHeight,
    );
    selectedPreset.value = preset ? preset.label : "";
};

const onPresetChange = (value: string) => {
    const preset = sizePresets.find((p) => p.label === value);
    if (preset) {
        formData.value.targetWidth = preset.width;
        formData.value.targetHeight = preset.height;
    }
};

onMounted(() => {
    updatePreset();
});
const getValue = async (): Promise<VideoSizeConvertForm | undefined> => {
    const data: any = {};
    data.targetWidth = formData.value.targetWidth;
    data.targetHeight = formData.value.targetHeight;
    data.fillMode = formData.value.fillMode;
    if (data.targetWidth <= 0 || isNaN(data.targetWidth)) {
        Dialog.tipError(t("error.validTargetWidth"));
        return;
    }
    if (data.targetHeight <= 0 || isNaN(data.targetHeight)) {
        Dialog.tipError(t("error.validTargetHeight"));
        return;
    }
    return data;
};

const setValue = (data: Partial<VideoSizeConvertForm>) => {
    if (data.targetWidth !== undefined) {
        formData.value.targetWidth = data.targetWidth;
    }
    if (data.targetHeight !== undefined) {
        formData.value.targetHeight = data.targetHeight;
    }
    if (data.fillMode !== undefined) {
        formData.value.fillMode = data.fillMode;
    }
    updatePreset();
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-5">
            <a-tooltip :content="$t('common.targetSize')" mini>
                <icon-expand />
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-input-number
                v-model="formData.targetWidth"
                :min="1"
                :max="4096"
                :step="1"
                :placeholder="$t('common.width')"
                style="width: 100px"
                @change="updatePreset"
            />
            <span>x</span>
            <a-input-number
                v-model="formData.targetHeight"
                :min="1"
                :max="4096"
                :step="1"
                :placeholder="$t('common.height')"
                style="width: 100px"
                @change="updatePreset"
            />
            <a-select
                v-model="selectedPreset"
                :placeholder="$t('common.selectPreset')"
                style="width: 200px"
                @change="onPresetChange"
            >
                <a-option
                    v-for="preset in sizePresets"
                    :key="preset.label"
                    :value="preset.label"
                >
                    {{ preset.label }}
                </a-option>
            </a-select>
        </div>
    </div>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-5">
            <a-tooltip :content="$t('common.fillMode')" mini>
                <icon-image />
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-radio-group v-model="formData.fillMode">
                <a-radio value="black">{{ $t("common.blackFill") }}</a-radio>
                <a-radio value="blur">{{ $t("common.blurFill") }}</a-radio>
                <a-radio value="crop">{{ $t("common.cropFill") }}</a-radio>
                <a-radio value="stretch">{{
                    $t("common.stretchFill")
                }}</a-radio>
            </a-radio-group>
        </div>
    </div>
</template>
