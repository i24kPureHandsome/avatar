<script setup lang="ts">
const props = defineProps<{
    data: {
        speed?: number;
    };
}>();
</script>

<template>
    <div class="flex flex-wrap mb-2 gap-1">
        <a-tag class="rounded-lg">{{
            data.speed
                ? `${$t("common.speedValue", { speed: data.speed })}`
                : $t("common.notConfigured")
        }}</a-tag>
    </div>
</template>
