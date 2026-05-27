<script setup lang="ts">
const props = defineProps<{
    data: {
        codec?: string;
        resolution?: string;
        compressionLevel?: number;
    };
}>();
</script>

<template>
    <div class="flex flex-wrap mb-2 gap-1">
        <a-tag v-if="data.codec" class="rounded-lg">{{
            `编码: ${data.codec}`
        }}</a-tag>
        <a-tag v-if="data.resolution" class="rounded-lg">{{
            `分辨率: ${data.resolution}`
        }}</a-tag>
        <a-tag v-if="data.compressionLevel !== undefined" class="rounded-lg"
            >{{ `压缩程度: ${data.compressionLevel}%` }}
        </a-tag>
        <a-tag
            v-if="
                !data.codec &&
                !data.resolution &&
                data.compressionLevel === undefined
            "
            class="rounded-lg"
        >
            未配置
        </a-tag>
    </div>
</template>
