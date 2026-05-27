<script setup lang="ts">
import { ref } from "vue";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";

const formData = ref({
    zoomDurationMs: 500,
});

type VideoZoomForm = {
    zoomDurationMs: number;
};

const zoomDurationPresets = [
    { label: "100ms", value: 100 },
    { label: "200ms", value: 200 },
    { label: "500ms", value: 500 },
    { label: "1000ms", value: 1000 },
    { label: "2000ms", value: 2000 },
];
const getValue = async (): Promise<VideoZoomForm | undefined> => {
    const data: any = {};
    data.zoomDurationMs = formData.value.zoomDurationMs;
    if (data.zoomDurationMs <= 0 || isNaN(data.zoomDurationMs)) {
        Dialog.tipError(t("error.validZoomDuration"));
        return;
    }
    return data;
};

const setValue = (data: Partial<VideoZoomForm>) => {
    if (data.zoomDurationMs !== undefined) {
        formData.value.zoomDurationMs = data.zoomDurationMs;
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
            <a-tooltip :content="$t('common.zoomDuration')" mini>
                <icon-zoom-in />
                {{ $t("common.zoomDuration") }}
            </a-tooltip>
        </div>
        <div class="flex-grow gap-2">
            <div>
                <a-slider
                    v-model="formData.zoomDurationMs"
                    :min="100"
                    :max="2000"
                    :step="100"
                    :style="{ width: '200px' }"
                />
            </div>
            <div class="flex gap-1">
                <a-button
                    v-for="preset in zoomDurationPresets"
                    :key="preset.value"
                    size="mini"
                    class="px-1"
                    :type="
                        formData.zoomDurationMs === preset.value
                            ? 'primary'
                            : 'outline'
                    "
                    @click="formData.zoomDurationMs = preset.value"
                >
                    {{ preset.label }}
                </a-button>
            </div>
        </div>
    </div>
</template>
