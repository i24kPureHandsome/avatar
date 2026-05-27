<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps<{
    data: {
        targetWidth?: number;
        targetHeight?: number;
        fillMode?: string;
    };
}>();

const fillModeMap: Record<string, string> = {
    blur: "common.blurFill",
    black: "common.blackFill",
    crop: "common.cropFill",
    stretch: "common.stretchFill",
};

const fillModeText = computed(() => {
    const mode = props.data.fillMode;
    return mode && fillModeMap[mode] ? t(fillModeMap[mode]) : mode;
});
</script>

<template>
    <div class="flex flex-wrap mb-2 gap-1">
        <a-tag class="rounded-lg">{{
            data.targetWidth && data.targetHeight
                ? `${data.targetWidth}x${data.targetHeight} (${fillModeText})`
                : $t("common.notConfigured")
        }}</a-tag>
    </div>
</template>
