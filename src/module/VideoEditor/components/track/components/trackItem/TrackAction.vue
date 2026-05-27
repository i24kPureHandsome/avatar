<template>
    <div
        class="pl-4 pb-1 pr-10 w-full h-10 border-b dark:border-darker border-gray-300"
    >
        <div
            class="float-left h-9 flex flex-row flex-nowrap items-center justify-around"
        >
            <div
                v-for="item of actions"
                :key="item.title"
                class="px-2 py-1"
                @click="handlerIcon(item)"
            >
                <a-tooltip
                    :disabled="item.disabled"
                    :effect="pageStore.isDark ? 'dark' : 'light'"
                    :content="item.title"
                    placement="bottom-start"
                >
                    <component
                        :is="item.comp"
                        class="focus:outline-0"
                        :class="
                            item.disabled
                                ? 'cursor-not-allowed text-gray-400'
                                : 'cursor-pointer hover:text-blue-500'
                        "
                    />
                    <div
                        v-if="!item.comp"
                        class="truncate text-xs border px-2 py-1 rounded-lg"
                        :class="
                            item.disabled
                                ? 'cursor-not-allowed text-gray-400'
                                : 'cursor-pointer hover:text-blue-500'
                        "
                    >
                        <component :is="item.icon" />
                        {{ item.title }}
                    </div>
                </a-tooltip>
            </div>
        </div>
        <div class="float-right flex w-52 h-9 justify-center items-center">
            <SubIcon
                :style="svgStyle"
                class="cursor-pointer mr-4"
                @click="changeScale(-10)"
            />
            <a-slider v-model="modelValue" v-bind="sliderProps" />
            <AddIcon
                :style="svgStyle"
                class="cursor-pointer ml-4"
                @click="changeScale(10)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import AddIcon from "../../../icons/AddIcon.vue";
import SubIcon from "../../../icons/SubIcon.vue";
import { usePageStore } from "../../../../stores/page";
import { usePlayerStore } from "../../../../stores/player";
import { useTrackStore } from "../../../../stores/track";
import { computed, reactive, ref } from "vue";
import { Dialog } from "../../../../../../lib/dialog";
import { VideoTrackItem } from "../../../../core/track/item/VideoTrackItem";
import { TrackActionItem } from "../../../../core/track/type";
import { VIDEO_PREVIEW_FIXED_FPS } from "../../../../core/config";
import UndoIcon from "../../../icons/UndoIcon.vue";
import RedoIcon from "../../../icons/RedoIcon.vue";
import SplitIcon from "../../../icons/SplitIcon.vue";
import DeleteIcon from "../../../icons/DeleteIcon.vue";
import { IconPlus } from "@arco-design/web-vue/es/icon";

const props = defineProps({
    modelValue: {
        type: Number,
        default: VIDEO_PREVIEW_FIXED_FPS,
    },
});
const emit = defineEmits({
    "update:modelValue": (val) => {
        return val !== null;
    },
});
const modelValue = computed({
    get() {
        return props.modelValue;
    },
    set(value) {
        emit("update:modelValue", value);
    },
});
const pageStore = usePageStore();
const trackStore = useTrackStore();
const playerStore = usePlayerStore();
const svgStyle = ref({
    fontSize: "1.75rem",
    padding: "0.25rem",
    boxSizing: "content-box",
});
const sliderProps = reactive({
    showTooltip: false,
    size: "mini",
    step: 10,
    max: 100,
    min: 0,
});

function changeScale(val: number) {
    let newVal = modelValue.value + val;
    if (newVal > sliderProps.max) newVal = sliderProps.max;
    if (newVal < sliderProps.min) newVal = sliderProps.min;
    modelValue.value = newVal;
}

const actions = computed<TrackActionItem[]>(() => {
    const records: TrackActionItem[] = [
        {
            type: "Undo",
            title: "撤销",
            disabled: true,
            comp: UndoIcon,
        },
        {
            type: "Redo",
            title: "重做",
            disabled: true,
            comp: RedoIcon,
        },
    ];
    if (pageStore.mode === "editor") {
        records.push({
            type: "Split",
            title: "分割",
            disabled:
                trackStore.selectTrackItem.line === -1 &&
                trackStore.selectTrackItem.index === -1,
            comp: SplitIcon,
        });
    }
    records.push({
        type: "Delete",
        title: "删除",
        disabled:
            trackStore.selectTrackItem.line === -1 &&
            trackStore.selectTrackItem.index === -1,
        comp: DeleteIcon,
    });
    if (pageStore.mode === "rectsSelector") {
        records.push({
            type: "RectSelector",
            title: "添加标注",
            icon: IconPlus,
            disabled: false,
        });
    }
    if (pageStore.mode === "timeRangesSelector") {
        records.push({
            type: "TimeRangeSelector",
            title: "添加时间段",
            icon: IconPlus,
            disabled: false,
        });
    }
    return records;
});

function handlerIcon(item: TrackActionItem) {
    if (item.disabled) {
        return;
    }
    if (item.type === "Delete") {
        if (
            trackStore.selectTrackItem.line !== -1 &&
            trackStore.selectTrackItem.index !== -1
        ) {
            trackStore.removeTrack(
                trackStore.selectTrackItem.line,
                trackStore.selectTrackItem.index,
            );
            trackStore.selectTrackItem.line = -1;
            trackStore.selectTrackItem.index = -1;
        }
    } else if (item.type === "Undo") {
        // pageStore._undo();
        Dialog.tipError("该功能正在开发中，敬请期待");
    } else if (item.type === "Redo") {
        // pageStore._redo();
        Dialog.tipError("该功能正在开发中，敬请期待");
    } else if (item.type === "Split") {
        // 判断分割时间是否在视频内
        let splitTime = playerStore.frameIndex;
        let active =
            trackStore.trackList[trackStore.selectTrackItem.line].list[
                trackStore.selectTrackItem.index
            ];
        if (
            splitTime > active.start &&
            splitTime < active.end &&
            active.type === "video"
        ) {
            const videoTrack = (active as VideoTrackItem).split(splitTime);
            videoTrack.resize({
                width: playerStore.canvasWidth,
                height: playerStore.canvasHeight,
            });
            trackStore.addTrack(videoTrack);
        }
    } else if (item.type === "RectSelector") {
        trackStore.addTrackFromBuildIn({}, "RectSelector", {
            initScale: 0.5,
            trackerNameType: "duration",
        });
    } else if (item.type === "TimeRangeSelector") {
        trackStore.addTrackFromBuildIn({}, "TimeRangeSelector", {
            trackerNameType: "duration",
            positionLocked: true,
            sizeLocked: true,
            initScale: 0.9,
        });
    }
}
</script>
