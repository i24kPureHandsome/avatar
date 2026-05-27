<script setup lang="ts">
const props = defineProps<{
    data: {
        zoomDurationMs?: number;
    };
}>();
</script>

<template>
    <div class="flex flex-wrap mb-2 gap-1">
        <a-tag class="rounded-lg"
            >{{ $t("common.zoomDuration") }}
            {{
                data.zoomDurationMs
                    ? data.zoomDurationMs + "ms"
                    : $t("common.notConfigured")
            }}</a-tag
        >
    </div>
</template>
