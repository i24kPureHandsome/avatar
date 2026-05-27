<template>
    <div
        class="absolute left-0 right-0 top-0 bottom-0 border z-20"
        :class="{ 'dark:border-gray-100 border-gray-400': isActive }"
        ref="el"
        v-show="isActive"
    >
        <div
            class="cursor-c-resize flex flex-col justify-center absolute -left-2 text-center rounded-tl rounded-bl w-2 dark:bg-gray-100 bg-gray-400 dark:text-gray-800 text-gray-100"
            style="bottom: -1px; top: -1px"
            ref="handlerLeft"
            @mousedown="mouseDownHandler($event, 'left')"
        >
            <span>|</span>
        </div>
        <div
            class="cursor-c-re size flex flex-col justify-center absolute -right-2 text-center rounded-tr rounded-br w-2 dark:bg-gray-100 bg-gray-400 dark:text-gray-800 text-gray-100"
            style="bottom: -1px; top: -1px"
            ref="handlerRight"
            @mousedown="mouseDownHandler($event, 'right')"
        >
            <span>|</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useTrackStore } from "../../../../stores/track";
import { usePlayerStore } from "../../../../stores/player";
import { computed, ref, toRefs } from "vue";
import { getGridPixel } from "../../../../core/track/canvas";
import {
    MediaTrackItem,
    TrackItem,
    VisibleTrackItem,
} from "../../../../core/track/type";
import { VIDEO_PREVIEW_FIXED_FPS } from "../../../../core/config";

const props = defineProps({
    isActive: {
        type: Boolean,
        default: false,
    },
    lineIndex: {
        type: Number,
        default: 0,
    },
    itemIndex: {
        type: Number,
        default: 0,
    },
});
const store = useTrackStore();
const playerStore = usePlayerStore();
const targetTrack = computed(() => {
    return store.trackList[props.lineIndex].list[props.itemIndex];
});

const el = ref();

// 定位数据缓存
let positionLeft = 0;
// 手柄可操作的属性配置
let handlerData = {
    isVA: false,
    start: 0,
    end: 0,
    offsetR: 0,
    offsetL: 0,
    minStart: 0,
    maxStart: 0,
    minEnd: 0,
    maxEnd: 0,
};
let enableMove = false;
let otherCoords: { left: number; right: number; start: number; end: number }[] =
    [];

// 获取吸附辅助线
function getFixLine(x: number, distance = 10) {
    // otherCoords、游标位置
    // 先获取与拖拽元素left、right，距离小于distance的元素
    const result: {
        position: number;
        frame: number;
    }[] = [];
    otherCoords.forEach((coord) => {
        if (Math.abs(coord.left - x) <= distance) {
            result.push({ position: coord.left, frame: coord.start });
        }
        if (Math.abs(coord.right - x) <= distance) {
            result.push({ position: coord.right, frame: coord.end });
        }
    });
    // 获取与游标位置距离小于distance的元素
    const trackPlayPointX = getGridPixel(
        store.trackScale,
        playerStore.frameIndex,
    );
    if (Math.abs(trackPlayPointX - x) <= distance) {
        result.push({
            position: trackPlayPointX,
            frame: playerStore.frameIndex,
        });
    }

    return result;
}

let fixPosition = { left: 0, right: 0, start: 0, end: 0 };

// 设置吸附
function adsorption(x: number, lines: { position: number; frame: number }[]) {
    if (lines.length === 0) {
        fixPosition.left = 0;
        fixPosition.right = 0;
        return;
    }
    // 吸附其实就是移动拖拽元素的位置
    // 找到最近的线，计算移动的距离
    const minLeftLine = lines.reduce(
        (r, item) => {
            return Math.abs(item.position - x) < Math.abs(r.position - x)
                ? item
                : r;
        },
        { position: Number.MAX_SAFE_INTEGER, frame: 0 },
    );

    // eslint-disable-next-line consistent-return
    return minLeftLine;
}

const frameWidth = computed(() => getGridPixel(store.trackScale, 1));

function initLimits(lineData: VisibleTrackItem[], trackItem: VisibleTrackItem) {
    const beforeTrack =
        props.itemIndex > 0 ? lineData[props.itemIndex - 1] : null;
    const afterTrack =
        props.itemIndex < lineData.length
            ? lineData[props.itemIndex + 1]
            : null;
    const isVA = ["video", "audio"].includes(trackItem.type);
    const limitData = {
        isVA,
        start: trackItem.start,
        end: trackItem.end,
        offsetR: (trackItem as MediaTrackItem).offsetR,
        offsetL: (trackItem as MediaTrackItem).offsetL,
        minStart: beforeTrack ? beforeTrack.end : 0, // 可以调节的最小start
        maxStart: trackItem.end - 1, // 最少要保留一帧数据
        minEnd: trackItem.start + 1,
        maxEnd: afterTrack
            ? afterTrack.start
            : VIDEO_PREVIEW_FIXED_FPS * 60 * 60, // 最长一小时
    };
    if (isVA) {
        // 音视频结尾受资源大小限制
        const rightMaxWidth = trackItem.frameCount - limitData.offsetL; // 右侧最大宽度
        const leftMaxWidth = trackItem.frameCount - limitData.offsetR; // 左侧最大宽度
        limitData.maxEnd = afterTrack
            ? Math.min(afterTrack.start, limitData.start + rightMaxWidth)
            : Math.min(
                  rightMaxWidth + limitData.start,
                  VIDEO_PREVIEW_FIXED_FPS * 60 * 60,
              );
        limitData.minStart = beforeTrack
            ? Math.max(beforeTrack.end, limitData.end - leftMaxWidth)
            : Math.max(limitData.end - leftMaxWidth, 0);
    }
    Object.assign(handlerData, {
        ...limitData,
    });
}

function setTrackFrameData(frameCount: number, handleType: string) {
    const {
        isVA,
        start: originStart,
        end: originEnd,
        offsetR,
        offsetL,
        minStart,
        maxStart,
        minEnd,
        maxEnd,
    } = handlerData;
    const originWidth = originEnd - originStart;
    const leftMaxWidth = offsetL + originWidth;
    const rightMaxWidth = offsetR + originWidth;
    if (handleType === "left") {
        // 操作左侧手柄
        let newStart = originStart + frameCount;
        if (newStart > maxStart) newStart = maxStart;
        if (newStart < minStart) newStart = minStart;
        let diffStart = newStart - originStart;
        if (isVA) {
            // 音视频的手柄操作限制在资源长度内，向内则视为资源裁切，裁切部分为 offset
            if (originEnd - newStart > leftMaxWidth) {
                // 音视频存在长度限制，手柄向内则截取， 向外展开截取，但是不能超过总长度
                newStart = originEnd - leftMaxWidth;
                diffStart = newStart - originStart;
            }
            (
                store.trackList[props.lineIndex].list[
                    props.itemIndex
                ] as MediaTrackItem
            ).offsetL = Math.max(offsetL + diffStart, 0);
        } else {
            // 其他资源操作无限制
            store.trackList[props.lineIndex].list[props.itemIndex].frameCount =
                originEnd - newStart;
        }
        store.trackList[props.lineIndex].list[props.itemIndex].start = newStart;
    } else {
        // 右侧手柄
        let newEnd = originEnd + frameCount;
        if (newEnd > maxEnd) newEnd = maxEnd;
        if (newEnd < minEnd) newEnd = minEnd;
        if (isVA) {
            // 音视频的手柄操作限制在资源长度内，向内则视为资源裁切，裁切部分为 offset
            if (newEnd - originStart > rightMaxWidth) {
                // 音视频存在长度限制，手柄向内则截取， 向外展开截取，但是不能超过总长度
                newEnd = originStart + rightMaxWidth;
            }
            const diffEnd = newEnd - originEnd;
            (
                store.trackList[props.lineIndex].list[
                    props.itemIndex
                ] as MediaTrackItem
            ).offsetR = Math.max(offsetR - diffEnd, 0);
        } else {
            // 其他资源操作无限制
            store.trackList[props.lineIndex].list[props.itemIndex].frameCount =
                newEnd - originStart;
        }
        store.trackList[props.lineIndex].list[props.itemIndex].end = newEnd;
    }
}

function mouseDownHandler(event: MouseEvent, type: string) {
    event.preventDefault();
    event.stopPropagation();

    otherCoords = [];
    for (let i = 0; i < store.trackList.length; i++) {
        for (let j = 0; j < store.trackList[i].list.length; j++) {
            if (i !== props.lineIndex || j !== props.itemIndex) {
                const item = store.trackList[i].list[j];
                otherCoords.push({
                    start: item.start,
                    end: item.end,
                    left: getGridPixel(store.trackScale, item.start),
                    right: getGridPixel(store.trackScale, item.end),
                });
            }
        }
    }
    playerStore.isPause = true;
    const { pageX: startX } = event;
    positionLeft = startX;
    enableMove = true;
    initLimits(
        (store.trackList[props.lineIndex]?.list || []) as VisibleTrackItem[],
        targetTrack.value as VisibleTrackItem,
    );

    const start = targetTrack.value.start;
    const end = targetTrack.value.end;

    const trackItem = el.value.closest(".trackItem");
    const position =
        type === "left"
            ? trackItem.offsetLeft
            : trackItem.offsetLeft + trackItem.offsetWidth;

    const onMove = (documentEvent) => {
        if (!enableMove) return;
        const { pageX } = documentEvent;
        const moveWidth = positionLeft - pageX;
        // 显示吸附线
        const lines = getFixLine(position - moveWidth);

        store.dragData.fixLines = [lines];

        const result = adsorption(position - moveWidth, lines);
        const frameCount = result?.frame
            ? type === "left"
                ? result.frame - start
                : result.frame - end
            : -Math.round(moveWidth / frameWidth.value);
        setTrackFrameData(frameCount, type);
    };

    const onUp = () => {
        enableMove = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
}
</script>

<style scoped></style>
