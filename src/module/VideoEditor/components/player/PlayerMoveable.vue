<template>
    <div
        ref="moveContainer"
        class="absolute left-0 right-0 top-0 bottom-0 m-auto"
    >
        <div
            v-for="(item, index) in targetList"
            :key="item.id"
            :data-eleId="item.id"
            :data-lineIndex="item.lineIndex"
            :data-itemIndex="item.itemIndex"
            :style="{
                zIndex: index,
                top: `${item.top}px`,
                left: `${item.left}px`,
                width: `${item.w}px`,
                height: `${item.h}px`,
                transform: `translate(${item.x}px, ${item.y}px) scale(${item.scaleX},${item.scaleY})`,
            }"
            class="move-target absolute"
            @click.stop="selectItem(item.id)"
            @mousedown="onMouseDown($event, item.id)"
        />
        <Moveable
            ref="moveable"
            v-bind="draggableOptions"
            @drag="onDrag"
            @scale="onScale"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import Moveable from "vue3-moveable";
import { defaultMoveOptions } from "../setting/data/constant";
import { usePlayerStore } from "../../stores/player";
import { useTrackStore } from "../../stores/track";
import { VisibleTrackItem } from "../../core/track/type";

const store = usePlayerStore();
const trackStore = useTrackStore();
const moveContainer = ref();
const moveable = ref();
const moveTarget = ref();

interface TargetItem {
    id: string;
    lineIndex: number;
    itemIndex: number;
    y: number;
    x: number;
    w: number;
    h: number;
    scaleX: number;
    scaleY: number;
    left: number;
    top: number;
}

const targetList = computed(() => {
    if (store.canvasHeight === 0 && store.canvasWidth === 0) {
        return [];
    }
    const layerArr: TargetItem[] = [];
    trackStore.trackList.forEach(({ list }, lineIndex) => {
        const index = list.findIndex((item: Record<string, any>, itemIndex) => {
            if (
                store.frameIndex >= item.start &&
                store.frameIndex <= item.end &&
                item.draw
            ) {
                return true;
            }
            return false;
        });
        const trackItem: VisibleTrackItem = list[index] as VisibleTrackItem;
        if (
            trackItem &&
            !trackItem.option.locked &&
            !(trackItem.option.positionLocked && trackItem.option.sizeLocked)
        ) {
            layerArr.unshift({
                lineIndex,
                itemIndex: index,
                id: trackItem.id,
                scaleX: trackItem.scaleX / 100,
                scaleY: trackItem.scaleY / 100,
                x: trackItem.centerX,
                y: trackItem.centerY,
                w: trackItem.width,
                h: trackItem.height,
                left: store.canvasWidth / 2 - trackItem.width / 2,
                top: store.canvasHeight / 2 - trackItem.height / 2,
            });
        }
    });
    nextTick(() => {
        moveable.value && moveable.value.updateRect();
    });
    return layerArr;
});
const draggableOptions = reactive({
    target: moveTarget,
    className: "video-editor-move",
    container: moveContainer.value,
    ...defaultMoveOptions,
});

function selectItem(eleid: string) {
    store.isPause = true;
    trackStore.selectTrackById(eleid);
}

function onDrag(params: Record<string, any>) {
    let { target, transform, translate } = params;
    const { lineindex, itemindex } = target.dataset;
    const [x, y] = translate;
    const trackItem = trackStore.trackList[lineindex].list[
        itemindex
    ] as VisibleTrackItem;
    if (trackItem.option.locked || trackItem.option.positionLocked) {
        return;
    }
    trackItem.centerX = x;
    trackItem.centerY = y;
    target.style.transform = transform;
}

function onScale(params: Record<string, any>) {
    let { target, scale, transform } = params;
    const { lineindex, itemindex } = target.dataset;
    const newScaleX = Math.max(Math.round(scale[0] * 100), 1);
    const newScaleY = Math.max(Math.round(scale[1] * 100), 1);
    const trackItem = trackStore.trackList[lineindex].list[
        itemindex
    ] as VisibleTrackItem;
    if (trackItem.option.locked || trackItem.option.sizeLocked) {
        return;
    }
    trackItem.scaleX = newScaleX;
    trackItem.scaleY = newScaleY;
    target.style.transform = transform;
}

function onMouseDown(event: MouseEvent, eleid: string) {
    event.stopPropagation();
    store.isPause = true;
    trackStore.selectTrackById(eleid);
    moveTarget.value = event.currentTarget;
    nextTick(() => {
        moveable.value.dragStart(event);
    });
}

watch(
    [trackStore.selectTrackItem, targetList],
    () => {
        if (
            moveContainer.value &&
            trackStore.selectTrackItem.line !== -1 &&
            trackStore.selectTrackItem.index !== -1
        ) {
            const targetTrack =
                trackStore.trackList[trackStore.selectTrackItem.line].list[
                    trackStore.selectTrackItem.index
                ];
            if (
                targetTrack &&
                targetList.value.find((item) => item.id === targetTrack.id)
            ) {
                moveTarget.value = moveContainer.value.querySelector(
                    `.move-target[data-eleid='${targetTrack.id}']`,
                );
            } else {
                moveTarget.value = null;
            }
        } else {
            moveTarget.value = null;
        }
    },
    { immediate: true, flush: "post" },
);
</script>

<style>
body .video-editor-move .moveable-control {
    @apply border w-3 h-3 border-yellow-400 bg-gray-50 -ml-1.5 -mt-1.5;
}

body .video-editor-move .moveable-line {
    @apply bg-yellow-400 w-px;
}
</style>
