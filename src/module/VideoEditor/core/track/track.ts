import type { BaseTrackItem, TrackLineItem } from "./type";
import { TrackItem } from "./type";
import { Reactive } from "vue";

/**
 * 检查 checkItem 是否与当前 trackList 存在帧重叠部分
 * */
export function checkTrackItemOverlap(
    trackList: BaseTrackItem[],
    checkItem: BaseTrackItem,
) {
    const { start: insertStart, end: insertEnd } = checkItem;
    let overLapIndex = -1;
    let insertIndex = 0;
    const hasOverlap = trackList
        .filter((item) => item.id !== checkItem.id)
        .some((trackItem, index) => {
            const { start, end } = trackItem;
            /**
             * 判断是否重叠：
             * 1. 落点在节点内部，重叠:start < insertStart < end || start < insertEnd < end
             * 2. 落点在节点外，但是落点在两边，重叠:start >= insertStart && end <= insertEnd
             */
            if (
                (start < insertStart && insertStart < end) ||
                (start < insertEnd && insertEnd < end) ||
                (start >= insertStart && end <= insertEnd)
            ) {
                overLapIndex = index;
                return true;
            } else {
                if (end <= insertStart) {
                    insertIndex = index + 1;
                }
                return false;
            }
        });
    return {
        hasOverlap,
        overLapIndex,
        insertIndex,
    };
}

export function isOfCanPlayType(value: BaseTrackItem) {
    return ["video", "audio", "image"].includes(value.type);
}

export const getCurrentTrackItemList = (
    trackList: TrackLineItem[] | Reactive<TrackLineItem[]>,
    currentFrame: number,
    isOfType: (value: BaseTrackItem) => boolean,
): TrackItem[] => {
    const trackItems: TrackItem[] = [];
    trackList.forEach(({ list }) => {
        list.forEach((trackItem) => {
            const { start, end } = trackItem;
            if (
                start <= currentFrame &&
                end >= currentFrame &&
                isOfType(trackItem)
            ) {
                trackItems.push(trackItem);
            }
        });
    });
    return trackItems;
};

/**
 * 检查 checkItem 是否与当前 trackList 存在帧重叠部分
 * */
export function checkTrackListOverlap(
    trackList: TrackItem[],
    checkItem: TrackItem,
    moveIndex = -1,
) {
    const { start: insertStart, end: insertEnd } = checkItem;
    let overLapIndex = -1;
    let insertIndex = 0;
    const hasOverlap = trackList.some((trackItem, index) => {
        if (moveIndex !== -1 && index === moveIndex) {
            // 行内移动情况下忽略掉移动元素
            return false;
        }
        const { start, end } = trackItem;
        // 当前列表中元素 开始帧处于新元素内部，或结束帧处于新元素内部，则视为重叠
        if (
            (start <= insertStart && end >= insertEnd) || // 添加节点的开始和结束位置位于老节点外 或 两端相等
            (start >= insertStart && start < insertEnd) || // 老节点开始位置在添加节点内部
            (end > insertStart && end <= insertEnd) // 老节点结束位置在添加节点内部
        ) {
            overLapIndex = index;
            return true;
        } else {
            if (end <= insertStart) {
                insertIndex = index + 1;
            }
            return false;
        }
    });
    return {
        hasOverlap,
        overLapIndex,
        insertIndex,
    };
}
