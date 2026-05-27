<script setup lang="ts">
import { usePageStore } from "../../../stores/page";

const pageStore = usePageStore();
</script>

<template>
    <div class="p-4">
        <div v-if="pageStore.mode === 'rectsSelector'">
            <div class="font-bold mb-4">使用说明</div>
            <div class="text-gray-400 text-xs">① 在轨道处添加矩形框</div>
            <div class="text-gray-400 text-xs">② 拖拽大小选中区域</div>
        </div>
        <div v-else-if="pageStore.mode === 'timeRangesSelector'">
            <div class="font-bold mb-4">使用说明</div>
            <div class="text-gray-400 text-xs">① 在轨道处添加时间区间</div>
            <div class="text-gray-400 text-xs">② 拖拽选中时间区间</div>
        </div>
    </div>
</template>
