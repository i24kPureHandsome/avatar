import { nextTick, ref, watch } from "vue";
import { defineStore } from "pinia";
import { useTrackStore } from "./track";

const PlayerDefaultFrameRate = 25;

export const usePlayerStore = defineStore("videoEditorPlayerState", () => {
    const trackStore = useTrackStore();

    const ready = ref(false);
    const loadingItemCount = ref(0);
    const frameCount = ref(0);
    const playerWidth = ref(1920);
    const playerHeight = ref(1080);
    const frameRate = ref(PlayerDefaultFrameRate);
    const canvasWidth = ref(0);
    const canvasHeight = ref(0);
    const existVideo = ref(false);

    const calcCanvasSize = () => {
        canvasWidth.value = playerWidth.value;
        canvasHeight.value = playerHeight.value;
        const maxSize = Math.max(canvasWidth.value, canvasWidth.value);
        if (maxSize > 720) {
            const ratio = maxSize / 720;
            canvasWidth.value = Math.floor(playerWidth.value / ratio);
            canvasHeight.value = Math.floor(playerHeight.value / ratio);
        }
    };
    calcCanvasSize();
    const frameIndex = ref(0);
    const playTargetTrackMap = ref(new Map());
    const isPause = ref(true);
    nextTick(() => {
        ready.value = true;
    });

    watch([playerWidth, playerHeight], () => {
        calcCanvasSize();
        // 更新所有现有轨道的尺寸
        trackStore.trackList.forEach((trackLine) => {
            trackLine.list.forEach((track) => {
                if (track.type === "video" || track.type === "image") {
                    (track as any).resize({
                        width: canvasWidth.value,
                        height: canvasHeight.value,
                    });
                }
            });
        });
        nextTick(() => {
            ready.value = true;
        });
    });

    const unready = () => {
        ready.value = false;
    };

    const waitReady = async () => {
        if (!ready.value) {
            await new Promise<void>((resolve) => {
                const unwatch = watch(ready, (newV) => {
                    if (newV) {
                        unwatch();
                        resolve();
                    }
                });
            });
        }
    };

    const canvasToPlayer = (val: number) => {
        return val * (playerWidth.value / canvasWidth.value);
    };
    const playerToCanvas = (val: number) => {
        return val * (canvasWidth.value / playerWidth.value);
    };

    const reset = () => {
        frameIndex.value = 0;
        loadingItemCount.value = 0;
        frameCount.value = 0;
        playerWidth.value = 1920;
        playerHeight.value = 1080;
        frameRate.value = PlayerDefaultFrameRate;
        canvasWidth.value = 0;
        canvasHeight.value = 0;
        existVideo.value = false;
        calcCanvasSize();
        playTargetTrackMap.value = new Map();
        isPause.value = true;
    };

    return {
        reset,
        unready,
        waitReady,
        isPause,
        frameIndex,
        loadingItemCount,
        playTargetTrackMap,
        existVideo,
        frameCount,
        frameRate,
        canvasToPlayer,
        playerToCanvas,
        playerWidth,
        playerHeight,
        canvasWidth,
        canvasHeight,
    };
});
