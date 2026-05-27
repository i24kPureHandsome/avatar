<script setup lang="ts">
import { ref } from "vue";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";

const formData = ref({
    position: "start",
    duration: 3,
    animation: "none",
    zoomPercent: 5,
});

type VideoMergeImageForm = {
    position: "start" | "end";
    duration: number;
    animation: "none" | "zoom";
    zoomPercent?: number;
};

const durationPresets = [
    { label: "1s", value: 1 },
    { label: "2s", value: 2 },
    { label: "3s", value: 3 },
    { label: "5s", value: 5 },
    { label: "10s", value: 10 },
];

const getValue = async (): Promise<VideoMergeImageForm | undefined> => {
    const data: any = {};

    data.duration = formData.value.duration;
    if (data.duration <= 0 || isNaN(data.duration)) {
        Dialog.tipError(t("error.validDuration"));
        return;
    }
    data.position = formData.value.position;
    data.animation = formData.value.animation;
    if (data.animation === "zoom") {
        data.zoomPercent = formData.value.zoomPercent;
        if (data.zoomPercent <= 0 || isNaN(data.zoomPercent)) {
            Dialog.tipError(t("error.validZoomPercent"));
            return;
        }
    }

    return data;
};

const setValue = (data: Partial<VideoMergeImageForm>) => {
    if (data.position !== undefined) {
        formData.value.position = data.position;
    }
    if (data.duration !== undefined) {
        formData.value.duration = data.duration;
    }
    if (data.animation !== undefined) {
        formData.value.animation = data.animation;
    }
    if (data.zoomPercent !== undefined) {
        formData.value.zoomPercent = data.zoomPercent;
    }
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <div>
        <div class="mb-4 flex items-start">
            <div class="pt-1 w-20">
                <a-tooltip :content="$t('common.positionStartImage')" mini>
                    {{ $t("common.position") }}
                </a-tooltip>
            </div>
            <div class="flex items-center gap-2">
                <a-radio-group v-model="formData.position" type="button">
                    <a-radio value="start">{{
                        $t("common.positionStart")
                    }}</a-radio>
                    <a-radio value="end">{{
                        $t("common.positionEnd")
                    }}</a-radio>
                </a-radio-group>
            </div>
        </div>
        <div class="mb-4 flex items-start">
            <div class="pt-1 w-20">
                <a-tooltip :content="$t('common.positionStartImage')" mini>
                    {{ $t("common.length") }}
                </a-tooltip>
            </div>
            <div class="flex items-center gap-2">
                <a-input-number
                    v-model="formData.duration"
                    :min="0.1"
                    :max="60"
                    :step="0.1"
                    :precision="1"
                    style="width: 80px"
                />
                <span class="text-gray-500">{{ $t("common.second") }}</span>
                <div class="flex gap-1">
                    <a-button
                        v-for="preset in durationPresets"
                        :key="preset.value"
                        size="mini"
                        class="px-1"
                        :type="
                            formData.duration === preset.value
                                ? 'primary'
                                : 'outline'
                        "
                        @click="formData.duration = preset.value"
                    >
                        {{ preset.label }}
                    </a-button>
                </div>
            </div>
        </div>
        <div class="mb-4 flex items-start">
            <div class="pt-1 w-20">
                <a-tooltip :content="$t('common.animation')" mini>
                    {{ $t("common.animation") }}
                </a-tooltip>
            </div>
            <div class="flex items-center gap-2">
                <a-radio-group v-model="formData.animation" type="button">
                    <a-radio value="none">{{ $t("common.none") }}</a-radio>
                    <a-radio value="zoom">{{ $t("common.zoomIn2") }}</a-radio>
                </a-radio-group>
            </div>
        </div>
        <div v-if="formData.animation === 'zoom'" class="mb-4 flex items-start">
            <div class="pt-1 w-20">
                <a-tooltip :content="$t('common.zoomPercent')" mini>
                    {{ $t("common.zoomPercent") }}
                </a-tooltip>
            </div>
            <div class="flex items-center gap-2">
                <a-input-number
                    v-model="formData.zoomPercent"
                    :min="1"
                    :max="100"
                    :step="1"
                    :precision="0"
                    style="width: 80px"
                />
                <span class="text-gray-500">%</span>
            </div>
        </div>
    </div>
</template>
