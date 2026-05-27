<template>
    <div class="p-2 absolute top-2 bottom-10 left-2 right-2 overflow-hidden">
        <canvas
            ref="playerCanvas"
            class="absolute left-0 right-0 top-0 bottom-0 m-auto bg-black border"
            id="player"
            :style="{
                transform: `scale(${scale})`,
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
            }"
        />
        <PlayerMoveable
            :style="{
                transform: `scale(${scale})`,
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
            }"
        />
    </div>
    <PlayerControl />
</template>

<script setup lang="ts">
import PlayerMoveable from "./PlayerMoveable.vue";
import PlayerControl from "./PlayerControl.vue";
import { computed, ref } from "vue";
import { usePlayerStore } from "../../stores/player";
import { PlayerCanvas } from "../../core/player/canvas";
import { storeToRefs } from "pinia";

const props = defineProps({
    containerSize: {
        // 容器大小
        type: Object,
        default() {
            return {
                width: 0,
                height: 0,
            };
        },
    },
});
const playerStore = usePlayerStore();
const playerCanvas = ref();

const player = new PlayerCanvas({
    player: playerCanvas,
    containerSize: props.containerSize,
});

const { canvasWidth, canvasHeight } = storeToRefs(playerStore);

const scale = computed(() => {
    let { width, height } = props.containerSize;
    height -= 64;
    width -= 16;
    return Math.min(width / canvasWidth.value, height / canvasHeight.value);
});
</script>
