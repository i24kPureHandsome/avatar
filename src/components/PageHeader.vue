<script setup lang="ts">
defineProps<{
    title: string;
    desc?: string;
}>();
</script>

<template>
    <div class="mb-4 flex items-center">
        <div class="flex-grow flex items-end">
            <div class="text-3xl font-bold">{{ title }}</div>
            <div v-if="desc" class="text-gray-400 ml-3">{{ desc }}</div>
        </div>
        <div v-if="$slots.actions" class="flex items-center gap-2 ml-4">
            <slot name="actions" />
        </div>
    </div>
</template>
