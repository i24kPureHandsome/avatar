<template>
    <div
        class="flex-1 overflow-hidden relative"
        ref="playerContent"
        @click="cancelSelect"
    >
        <Player :containerSize="containerSize" />
    </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { usePageStore } from "../../stores/page";
import { usePlayerStore } from "../../stores/player";
import { useTrackStore } from "../../stores/track";
import Player from "./Player.vue";

const pageStore = usePageStore();
const playerStore = usePlayerStore();
const trackStore = useTrackStore();
const playerContent = ref();
const containerSize = reactive({
    width: 0,
    height: 0,
});

function cancelSelect(event: MouseEvent) {
    event.stopPropagation();
    trackStore.selectTrackItem.line = -1;
    trackStore.selectTrackItem.index = -1;
}

// 更新画布尺寸
function updateContainerSize() {
    if (!playerContent.value) return;
    let { width: maxW, height: maxH } =
        playerContent.value.getBoundingClientRect();
    containerSize.width = maxW;
    containerSize.height = maxH;
}

watch(
    () => [pageStore.trackHeight, pageStore.settingWidth],
    () => {
        updateContainerSize();
    },
    {
        flush: "post",
    },
);
onMounted(() => {
    updateContainerSize();
});
watch(
    [() => playerStore.canvasHeight, () => playerStore.canvasWidth],
    () => {
        updateContainerSize();
    },
    {
        flush: "post",
    },
);
</script>
