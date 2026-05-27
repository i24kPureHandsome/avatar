<template>
    <div
        class="mb-1 mt-1 relative ml-2 trackLine"
        :class="[
            TrackHeightMap.get(lineType),
            isActive
                ? 'dark:bg-gray-300 bg-gray-300 bg-opacity-20'
                : 'bg-gray-200 bg-opacity-10',
            isMain ? 'bg-blue-300 bg-opacity-20' : '',
        ]"
        :data-index="lineIndex"
        :data-type="lineType"
    >
        <template v-for="(item, index) of lineData" :key="item.id">
            <TrackItem
                :lineIndex="lineIndex"
                :itemIndex="index"
                :trackItem="item as any"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { TrackHeightMap } from "../../../../core/track/config";
import { useTrackStore } from "../../../../stores/track";
import TrackItem from "./TrackItem.vue";

const props = defineProps({
    isMain: {
        type: Boolean,
        default: false,
    },
    lineType: {
        type: String,
        default: "",
    },
    lineIndex: {
        type: Number,
        default: 0,
    },
    lineData: {
        type: Array,
        default() {
            return [];
        },
    },
});
const store = useTrackStore();
const isActive = computed(() => {
    return store.selectTrackItem.line === props.lineIndex;
});
</script>

<style scoped>
.showLine-t::after {
    content: "";
    display: block;
    position: absolute;
    top: 1px;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #fcd34d;
    z-index: 30;
}

.showLine-b::before {
    content: "";
    display: block;
    position: absolute;
    bottom: 1px;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #fcd34d;
    z-index: 30;
}
</style>
