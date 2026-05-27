<template>
    <div
        class="flex items-center justify-center absolute bottom-0 left-0 right-0 px-4 h-8 border-t dark:border-darker border-gray-300"
    >
        <div
            class="text-xs leading-8 font-mono flex-grow flex items-center select-none"
        >
            <span class="text-blue-400 w-18 inline-block">{{ playTime }}</span>
            <span class="text-gray-400 px-1">/</span>
            <span class="w-18">{{ allTime }}</span>
        </div>
        <div class="m-auto flex items-center">
            <div class="" :class="disable ? 'text-gray-300' : 'cursor-pointer'">
                <icon-play-circle v-if="playerStore.isPause" @click="doPlay" />
                <icon-pause-circle v-else @click="doPause" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { usePlayerStore } from "../../stores/player";
import { useTrackStore } from "../../stores/track";
import {
    getCurrentTrackItemList,
    isOfCanPlayType,
} from "../../core/track/track";
import { formatPlayerTime } from "../../core/util";
import { MediaTrackItem } from "../../core/track/type";
import { preciseInterval } from "../../../../lib/util";
import { VIDEO_PREVIEW_FIXED_FPS_INTERVAL } from "../../core/config";

const props = defineProps({
    disable: {
        type: Boolean,
        default: false,
    },
});
const playerStore = usePlayerStore();
const trackStore = useTrackStore();
const playTime = computed(() => {
    return formatPlayerTime(playerStore.frameIndex);
});
const allTime = computed(() => {
    return formatPlayerTime(trackStore.frameCount);
});
let playTimer = ref();
// 视频暂停
const doPause = () => {
    if (props.disable) return;
    playerStore.isPause = true;
    playTimer.value?.cancel();
    const trackItems = getCurrentTrackItemList(
        trackStore.trackList,
        playerStore.frameIndex,
        isOfCanPlayType,
    );
    trackItems.forEach((item) => {
        (item as MediaTrackItem).pause();
    });
};

function doPlay() {
    if (props.disable) {
        return;
    }
    const trackItems = getCurrentTrackItemList(
        trackStore.trackList,
        playerStore.frameIndex,
        isOfCanPlayType,
    );
    if (trackItems.length === 0) {
        return;
    }
    if (playerStore.frameIndex >= trackStore.frameCount) {
        playerStore.frameIndex = 0;
    }
    playerStore.isPause = false;
    playTimer.value?.cancel();
    playTimer.value = preciseInterval(() => {
        const currentTrackItemList = getCurrentTrackItemList(
            trackStore.trackList,
            playerStore.frameIndex,
            isOfCanPlayType,
        );
        if (currentTrackItemList.length === 0) {
            doPause();
            return;
        }
        playerStore.frameIndex++;
        if (playerStore.frameIndex === trackStore.frameCount) {
            doPause();
        }
    }, VIDEO_PREVIEW_FIXED_FPS_INTERVAL);
}

// 在一些操作时，需要暂停播放
watch(
    () => playerStore.isPause,
    () => {
        if (playerStore.isPause) {
            doPause();
        }
    },
);
watch(
    () => playerStore.frameIndex,
    () => {
        if (!playerStore.isPause) {
            // 播放声音，查询当前帧的数据
            const trackItems = getCurrentTrackItemList(
                trackStore.trackList,
                playerStore.frameIndex,
                isOfCanPlayType,
            );
            trackItems.forEach((item) => {
                (item as MediaTrackItem).play(playerStore.frameIndex);
            });
        }
    },
);
onBeforeUnmount(() => {
    playTimer.value?.cancel();
});
</script>

<style scoped></style>
