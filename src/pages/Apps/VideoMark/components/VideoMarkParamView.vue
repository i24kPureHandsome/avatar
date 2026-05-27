<script setup lang="ts">
const props = defineProps<{
    data: {
        borderColor?: string;
        borderWidth?: number;
        borderOpacity?: number;
        borderRadius?: number;
        borderStyle?: "solid" | "dashed";
    };
}>();
</script>

<template>
    <div class="flex flex-wrap items-center gap-1 mb-2">
        <a-tag class="rounded-lg"
            >边框颜色 {{ data.borderColor || "未配置" }}</a-tag
        >
        <a-tag class="rounded-lg"
            >边框宽度 {{ data.borderWidth || "未配置" }}</a-tag
        >
        <a-tag class="rounded-lg"
            >边框不透明度
            {{
                data.borderOpacity ? data.borderOpacity * 100 + "%" : "未配置"
            }}</a-tag
        >
        <a-tag class="rounded-lg"
            >圆角 {{ data.borderRadius || "未配置" }}</a-tag
        >
        <a-tag class="rounded-lg"
            >线条样式
            {{
                data.borderStyle === "solid"
                    ? "实线"
                    : data.borderStyle === "dashed"
                      ? "虚线"
                      : "未配置"
            }}</a-tag
        >
    </div>
</template>
