<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import Router from "../router";
import {
    SoundToolApps,
    ToolApps,
    VideoProcessingApps,
    VideoApps,
} from "./Apps/all";

const tab = ref("");

const groups = [
    // { title: "声音处理", apps: SoundToolApps },
    // { title: "图像生成", apps: ToolApps },
    // { title: "视频处理", apps: VideoProcessingApps },
    { title: "视频工具", apps: VideoApps },
];

// const allToolApps = [...SoundToolApps, ...ToolApps, ...VideoProcessingApps];
const allToolApps = [...VideoApps];

const syncTab = () => {
    tab.value =
        (Router.currentRoute.value.query.tab as string) || "TextCutVideo";
};

onMounted(() => {
    syncTab();
});

watch(() => Router.currentRoute.value.query.tab, syncTab);

const dynamicComponent = computed(() => {
    for (const app of allToolApps) {
        if (app.name === tab.value) {
            return app.component;
        }
    }
    return null;
});
</script>

<template>
    <div class="pb-device-container bg-white h-full relative select-none flex">
        <div
            class="w-52 flex-shrink-0 border-r border-solid border-gray-100 overflow-x-hidden overflow-y-auto"
        >
            <template v-for="group in groups" :key="group.title">
                <div class="px-4 pt-4 pb-1 text-xs text-gray-400">
                    {{ group.title }}
                </div>
                <div class="px-3">
                    <div
                        v-for="s in group.apps"
                        :key="s.name"
                        class="p-2 rounded-lg mb-1 cursor-pointer"
                        :class="
                            tab === s.name ? 'bg-gray-200' : 'hover:bg-gray-100'
                        "
                        @click="tab = s.name"
                    >
                        <div class="text-base truncate flex items-center">
                            <component
                                :is="
                                    typeof s.icon === 'string' ? 'img' : s.icon
                                "
                                :src="
                                    typeof s.icon === 'string'
                                        ? s.icon
                                        : undefined
                                "
                                class="w-5 h-5 mr-1 object-contain flex-shrink-0"
                                :style="
                                    typeof s.icon === 'string'
                                        ? {}
                                        : { color: s.color }
                                "
                            />
                            {{ s.title }}
                        </div>
                    </div>
                </div>
            </template>
        </div>
        <div class="flex-grow h-full overflow-y-auto">
            <component :is="dynamicComponent" />
        </div>
    </div>
</template>

<style scoped></style>
