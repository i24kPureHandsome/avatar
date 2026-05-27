<template>
    <div
        class="z-30 w-px absolute -top-5 bottom-0 bg-gray-400 dark:bg-gray-200 transition-transform duration-75"
        id="trackPlayPoint"
        :style="trackStyle"
        @mousedown="onMouseDown"
    >
        <span
            class="playPoint block border-1 border-gray-400 bg-gray-400 h-3 w-2.5 dark:border-gray-100 dark:bg-gray-100 sticky top-0 right-0 left-0 cursor-move"
        />
    </div>
</template>

<script setup lang="ts">
import { getGridPixel, getSelectFrame } from "../../../../core/track/canvas";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useTrackStore } from "../../../../stores/track";
import { usePlayerStore } from "../../../../stores/player";
import { VIDEO_PREVIEW_FIXED_FPS } from "../../../../core/config";

const offsetLine = {
    left: 10,
};

const trackStore = useTrackStore();
const playerStore = usePlayerStore();
const trackStyle = computed(() => {
    return {
        left: `${offsetLine.left}px`,
        transform: `translate(${getGridPixel(trackStore.trackScale, playerStore.frameIndex)}px, 0px)`,
    };
});

const isDragging = ref(false);

function onMouseDown(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    playerStore.isPause = true;
    isDragging.value = true;
}

function onMouseMove(event: MouseEvent) {
    // event.stopPropagation();
    // event.preventDefault();
    if (isDragging.value) {
        // 获取相对于#timeline的偏移量
        const rect = document
            .getElementById("track-container")!
            .getBoundingClientRect();
        // 默认fps为30
        const frame = getSelectFrame(
            event.pageX - offsetLine.left - rect.left,
            trackStore.trackScale,
            VIDEO_PREVIEW_FIXED_FPS,
        );

        const playFrame = frame - 1;
        const startFrame =
            playFrame < 0
                ? 0
                : playFrame > trackStore.frameCount
                  ? trackStore.frameCount
                  : playFrame;
        playerStore.frameIndex = startFrame;
    }
}

function onMouseUp(event: MouseEvent) {
    // event.stopPropagation();
    // event.preventDefault();
    isDragging.value = false;
}

onMounted(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
});
onUnmounted(() => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
});
</script>

<style scoped>
.playPoint {
    transform: translateX(-50%);
}

.playPoint::after {
    content: "";
    display: block;
    width: 10px;
    height: 10px;
    border: 5px solid;
    position: absolute;
    top: 100%;
    border-right-color: transparent;
    border-left-color: transparent;
    border-bottom-color: transparent;
    @apply border-t-gray-400 dark:border-t-gray-100;
}
</style>
