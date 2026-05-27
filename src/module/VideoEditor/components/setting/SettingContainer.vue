<template>
    <div
        class="select-none relative pl-2"
        :style="{ width: `${pageStore.settingWidth}px` }"
    >
        <SplitLine
            class="top-0 left-0 bottom-0"
            direction="vertical"
            :limitSize="limitSize"
            v-model:newWidth="pageStore.settingWidth"
        />
        <div class="absolute top-0 left-3 right-2 bottom-0 overflow-y-auto">
            <ProjectSetting
                v-if="
                    selectTrackOptionsConfig.length === 0 &&
                    ['editor'].includes(pageStore.mode)
                "
            />
            <EmptySetting
                v-else-if="
                    selectTrackOptionsConfig.length === 0 &&
                    ['rectsSelector', 'timeRangesSelector'].includes(
                        pageStore.mode,
                    )
                "
            />
            <EmptySetting
                v-else-if="['timeRangesSelector'].includes(pageStore.mode)"
            />
            <TrackSetting
                v-else
                :attrData="selectTrackOptionsConfig"
                :trackId="trackStore.selectResource?.id"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { usePageStore } from "../../stores/page";
import { useTrackStore } from "../../stores/track";
import TrackSetting from "./components/TrackSetting.vue";
import SplitLine from "../SplitLine.vue";
import ProjectSetting from "./components/ProjectSetting.vue";
import EmptySetting from "./components/EmptySetting.vue";

const pageStore = usePageStore();
const trackStore = useTrackStore();

const TrackOptionsConfig: Record<string, any> = {};
const attributeFiles = import.meta.glob("./data/options/*.ts", { eager: true });
for (const path in attributeFiles) {
    const name = path.match(/(?<=\/)(\w+)(?=\.ts)/);
    if (name && name[0]) {
        TrackOptionsConfig[name[0]] = (
            attributeFiles[path] as { Options: Record<string, any> }
        ).Options;
    }
}

const selectTrackOptionsConfig = computed(() => {
    const optionsConfig =
        trackStore.selectResource &&
        TrackOptionsConfig[trackStore.selectResource.type];
    return optionsConfig ? optionsConfig.attributes : [];
});
const limitSize = computed(() => {
    return {
        minWidth: 300,
        maxWidth: Math.min(Math.max(pageStore.mainWidth - 100, 300), 500),
    };
});
</script>
