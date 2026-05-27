<script setup lang="ts">
const props = defineProps<{
    data: {
        normalizationPercentage?: number;
    };
}>();
</script>

<template>
    <div class="flex flex-wrap mb-2 gap-1">
        <a-tag class="rounded-lg">{{
            data.normalizationPercentage !== undefined
                ? `归一化程度 ${data.normalizationPercentage}%`
                : "未配置"
        }}</a-tag>
    </div>
</template>
