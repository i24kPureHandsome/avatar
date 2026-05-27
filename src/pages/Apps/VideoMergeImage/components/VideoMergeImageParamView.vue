<script setup lang="ts">
const props = defineProps<{
    data: {
        position: "start" | "end";
        duration: number;
        animation: "none" | "zoom";
        zoomPercent?: number;
    };
}>();
</script>

<template>
    <div class="flex flex-wrap mb-2 gap-1">
        <a-tag class="rounded-lg">
            <icon-image />
            {{
                data.position
                    ? data.position === "start"
                        ? $t("common.positionStartImage")
                        : $t("common.positionEndImage")
                    : $t("common.notConfigured")
            }}
        </a-tag>
        <a-tag class="rounded-lg">
            {{
                data.duration !== undefined
                    ? `${data.duration}${$t("common.second")}`
                    : $t("common.notConfigured")
            }}
        </a-tag>
        <a-tag v-if="data.animation === 'zoom'" class="rounded-lg">
            {{ $t("common.zoomIn2") }}: {{ data.zoomPercent }}%
        </a-tag>
        <a-tag v-else-if="data.animation === 'none'" class="rounded-lg">
            {{ $t("common.noAnimation") }}
        </a-tag>
    </div>
</template>
