<template>
    <div
        class="flex absolute justify-center items-center"
        :class="[
            disabled
                ? 'cursor-no-drop'
                : isVertical
                  ? 'cursor-c-resize'
                  : 'cursor-r-resize',
            isVertical ? 'w-2 h-full flex-col' : 'h -2 w-full flex-row',
        ]"
        ref="lineElement"
        @mousedown="onMouseDown"
    >
        <div
            class="absolute flex z-10 dark:bg-darker bg-white"
            :class="isVertical ? 'h-8 w-4 flex-col' : 'w-8 h-4 flex-row'"
        >
            <div
                class="flex-auto text-center"
                :class="isVertical ? 'rotate-90 -ml-2.5' : '-mt-0.5'"
                :style="{ color: iconColor }"
            >
                <icon-more />
            </div>
        </div>
        <i
            class="block dark:bg-darker bg-gray-300"
            :class="
                isVertical ? 'dark:w-0.5 w-px h-full' : 'dark:h-0.5 h-px w-full'
            "
        />
    </div>
</template>

<script setup lang="ts">
import { usePageStore } from "../stores/page";
import { computed, ref } from "vue";

const props = defineProps({
    disabled: {
        type: Boolean,
        default: false,
    },
    newWidth: {
        type: Number,
        default: 0,
    },
    newHeight: {
        type: Number,
        default: 0,
    },
    direction: {
        type: String,
        default: "horizontal",
    },
    limitSize: {
        type: Object,
        default() {
            return {
                minHeight: 0,
                maxHeight: 999999,
                minWidth: 0,
                maxWidth: 999999,
            };
        },
    },
});

const emit = defineEmits({
    "update:newWidth": (val) => {
        return val !== null;
    },
    "update:newHeight": (val) => {
        return val !== null;
    },
});

const newWidthValue = computed({
    get() {
        return props.newWidth;
    },
    set(newValue) {
        emit("update:newWidth", newValue);
    },
});
const newHeightValue = computed({
    get() {
        return props.newHeight;
    },
    set(newValue) {
        emit("update:newHeight", newValue);
    },
});

const lineElement = ref();
const store = usePageStore();
const isVertical = computed(() => props.direction === "vertical");
const iconColor = computed(() => {
    return store.isDark ? "#E5E7EB" : "#1F2937";
});
// 定位数据缓存
const positionState = {
    left: 0,
    top: 0,
};

let enableMove = false;

function onMouseDown() {
    if (props.disabled) {
        return;
    }
    const { left, top } = lineElement.value.getBoundingClientRect();
    positionState.left = parseInt(left);
    positionState.top = parseInt(top);
    enableMove = true;

    const onMove = (e: MouseEvent) => {
        if (!enableMove) {
            return;
        }
        const { pageX, pageY } = e;
        const { top: oldTop, left: oldLeft } = positionState;
        const { minHeight, maxHeight, minWidth, maxWidth } = props.limitSize;
        const offsetX = pageX - oldLeft;
        const offsetY = pageY - oldTop;
        positionState.left = pageX;
        positionState.top = pageY;
        if (isVertical.value) {
            const newWidth = newWidthValue.value - offsetX;
            newWidthValue.value =
                newWidth > maxWidth
                    ? maxWidth
                    : newWidth < minWidth
                      ? minWidth
                      : newWidth;
        } else {
            const newHeight = newHeightValue.value - offsetY;
            newHeightValue.value =
                newHeight > maxHeight
                    ? maxHeight
                    : newHeight < minHeight
                      ? minHeight
                      : newHeight;
        }
    };

    const onUp = () => {
        enableMove = false;
        document.removeEventListener("mouseup", onUp);
        document.removeEventListener("mousemove", onMove);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
}
</script>
