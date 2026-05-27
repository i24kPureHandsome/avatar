<template>
    <div
        class="overflow-hidden select-none relative pt-2 flex flex-col"
        :style="{ height: `${pageStore.trackHeight}px` }"
    >
        <SplitLine
            class="top-0 left-0 right-0"
            direction="horizontal"
            :limitSize="limitSize"
            v-model:newHeight="pageStore.trackHeight"
        />
        <TrackAction v-model="trackStore.trackScale" />
        <TrackList />
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { usePageStore } from "../../stores/page";
import { useTrackStore } from "../../stores/track";
import TrackAction from "./components/trackItem/TrackAction.vue";
import SplitLine from "../SplitLine.vue";
import TrackList from "./components/TrackList.vue";

const pageStore = usePageStore();
const trackStore = useTrackStore();
const limitSize = computed(() => {
    return {
        minHeight: 200,
        maxHeight: pageStore.containerHeight - 100,
    };
});
</script>
