<script setup lang="ts">
import { PropType } from "vue";

const props = defineProps({
    record: {
        type: Object as PropType<{
            serverTitle: string;
            serverVersion: string;
        }>,
        required: true,
    },
});
</script>

<template>
    <a-tag class="rounded-lg">
        <i-mdi-server-outline class="w-5 h-5" />
        {{ record.serverTitle }}
        v{{ record.serverVersion }}
    </a-tag>
</template>

<style scoped></style>
