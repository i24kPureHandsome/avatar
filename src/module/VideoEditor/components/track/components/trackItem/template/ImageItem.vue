<template>
    <div class="flex flex-col rounded overflow-hidden h-full">
        <div
            class="flex items-center text-xs pl-2 overflow-hidden h-6 leading-6 bg-yellow-700 bg-opacity-70 text-gray-300"
        >
            <img
                :src="trackItem.source.url"
                class="w-4 h-4 inline-block mr-2 shrink-0"
                alt=""
                draggable="false"
            />
            <span class="mr-4 shrink-0">{{ name }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, type PropType, watch } from "vue";
import type { ImageTrackItem } from "../../../../../core/track/item/ImageTrackItem";
import trackCheckPlaying from "./trackCheckPlaying";
import { formatTime } from "../../../../../core/util";
import { VIDEO_PREVIEW_FIXED_FPS } from "../../../../../core/config";

const props = defineProps({
    trackItem: {
        type: Object as PropType<ImageTrackItem>,
        default() {
            return {
                width: "0px",
                left: "0px",
            };
        },
    },
});
const name = computed(() => {
    if (props.trackItem.option.trackerNameType === "duration") {
        return formatTime(
            (1000 * props.trackItem.frameCount) / VIDEO_PREVIEW_FIXED_FPS,
        ).str;
    }
    return props.trackItem.name;
});
async function initImage() {
    const { name, source, format, width, height } = props.trackItem;
    if (name && source) {
        const imageName = `${name}.${format}`;
    }
}

watch(
    () => {
        return props.trackItem.source;
    },
    initImage,
    {
        immediate: true,
        flush: "post",
    },
);
trackCheckPlaying(props);
</script>
