<script setup lang="ts">
const props = defineProps<{
    data: {
        volume?: number;
        loopAudio?: boolean;
        fadeInTime?: number;
        fadeOutTime?: number;
    };
}>();
</script>

<template>
    <div class="flex flex-wrap mb-2 gap-1">
        <a-tag class="rounded-lg"
            >{{ $t("common.volume") }}
            {{
                data.volume !== undefined
                    ? `${data.volume}%`
                    : $t("common.notConfigured")
            }}</a-tag
        >
        <a-tag class="rounded-lg"
            >{{ $t("common.loopAudio") }}
            {{
                data.loopAudio !== undefined
                    ? data.loopAudio
                        ? $t("common.yes")
                        : $t("common.no")
                    : $t("common.notConfigured")
            }}</a-tag
        >
        <a-tag class="rounded-lg"
            >{{ $t("common.fadeIn") }}
            {{
                data.fadeInTime !== undefined
                    ? `${data.fadeInTime}ms`
                    : $t("common.notConfigured")
            }}</a-tag
        >
        <a-tag class="rounded-lg"
            >{{ $t("common.fadeOut") }}
            {{
                data.fadeOutTime !== undefined
                    ? `${data.fadeOutTime}ms`
                    : $t("common.notConfigured")
            }}</a-tag
        >
    </div>
</template>
