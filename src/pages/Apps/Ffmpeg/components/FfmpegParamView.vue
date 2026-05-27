<script setup lang="ts">
const props = defineProps<{
    data: {
        commands: [];
    };
}>();
</script>

<template>
    <div class="mb-2 flex flex-wrap gap-1">
        <template
            v-if="data.commands && data.commands.length > 0"
            class="space-y-1"
        >
            <a-tag class="rounded-lg"> ffmpeg </a-tag>
            <a-tag
                v-for="(command, index) in data.commands"
                :key="index"
                class="rounded-lg"
            >
                {{ command }}
            </a-tag>
        </template>
        <template v-else>
            <a-tag class="rounded-lg">未配置</a-tag>
        </template>
    </div>
</template>
