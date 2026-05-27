<script setup lang="ts">
const props = defineProps<{
    data: {
        transitionEffect?: string;
        transitionDuration?: number;
    };
}>();

const getTransitionEffectText = (effect?: string) => {
    if (!effect) return "未配置";
    const map: Record<string, string> = {
        none: "无",
        fade: "淡入淡出",
        wipeleft: "左擦除",
        wiperight: "右擦除",
        slideleft: "左滑动",
        slideright: "右滑动",
        dissolve: "溶解",
    };
    return map[effect] || effect;
};
</script>

<template>
    <div class="flex flex-wrap mb-2 gap-1">
        <a-tag class="rounded-lg"
            >转场特效
            {{ getTransitionEffectText(data.transitionEffect) }}</a-tag
        >
        <a-tag
            v-if="data.transitionEffect && data.transitionEffect !== 'none'"
            class="rounded-lg"
            >转场时长
            {{
                data.transitionDuration
                    ? `${data.transitionDuration}ms`
                    : "未配置"
            }}
        </a-tag>
    </div>
</template>
