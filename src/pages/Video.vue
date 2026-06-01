<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { t } from "../lang";
import Router from "../router";
import SoundGenerate from "./Video/SoundGenerate.vue";
import VideoGen from "./Video/VideoGen.vue";
import VideoTemplate from "./Video/VideoTemplate.vue";
import VideoGenFlow from "./Apps/VideoGenFlow/VideoGenFlow.vue";

const tab = ref("");

const syncTab = () => {
    tab.value =
        (Router.currentRoute.value.query.tab as string) || "soundGenerate";
};

onMounted(() => {
    syncTab();
});

watch(() => Router.currentRoute.value.query.tab, syncTab);
</script>

<template>
    <div class="pb-device-container bg-white h-full relative select-none flex">
        <div
            class="p-6 w-52 flex-shrink-0 border-r border-solid border-gray-100 overflow-x-hidden overflow-y-auto"
        >
            <div class="text-xs text-gray-400 mb-2 uppercase">声音克隆</div>
            <div
                class="p-2 rounded-lg mb-2 cursor-pointer"
                :class="tab === 'soundGenerate' ? 'bg-gray-200' : ''"
                @click="tab = 'soundGenerate'"
            >
                <div class="text-base truncate flex items-center">
                    <i-mdi-waveform
                        class="w-5 h-5 inline-block text-indigo-500 mr-1"
                    />
                    {{ t("voice.synthesis") }}
                </div>
            </div>
            <div class="text-xs text-gray-400 mb-2 mt-4 uppercase">数字人</div>
            <div
                class="p-2 rounded-lg mb-2 cursor-pointer"
                :class="tab === 'videoTemplate' ? 'bg-gray-200' : ''"
                @click="tab = 'videoTemplate'"
            >
                <div class="text-base truncate flex items-center">
                    <i-mdi-account-box
                        class="w-5 h-5 inline-block text-blue-500 mr-1"
                    />
                    {{ t("avatar.avatar") }}
                </div>
            </div>
            <div
                class="p-2 rounded-lg mb-2 cursor-pointer"
                :class="tab === 'videoGen' ? 'bg-gray-200' : ''"
                @click="tab = 'videoGen'"
            >
                <div class="text-base truncate flex items-center">
                    <i-mdi-video-account
                        class="w-5 h-5 inline-block text-violet-500 mr-1"
                    />
                    {{ t("avatar.synthesis") }}
                </div>
            </div>
            <div
                class="p-2 rounded-lg mb-2 cursor-pointer"
                :class="tab === 'VideoGenFlow' ? 'bg-gray-200' : ''"
                @click="tab = 'VideoGenFlow'"
            >
                <div class="text-base truncate flex items-center">
                    <i-mdi-auto-fix
                        class="w-5 h-5 inline-block text-emerald-500 mr-1"
                    />
                    {{ t("avatar.oneClickSynthesis") }}
                </div>
            </div>
        </div>
        <div class="flex-grow h-full overflow-y-auto">
            <div
                v-if="tab === 'soundGenerate'"
                data-auto-test-id="dh-soundGenerate"
            >
                <SoundGenerate />
            </div>
            <div v-else-if="tab === 'videoGen'" data-auto-test-id="dh-videoGen">
                <VideoGen />
            </div>
            <div
                v-else-if="tab === 'videoTemplate'"
                data-auto-test-id="dh-videoTemplate"
            >
                <VideoTemplate />
            </div>
            <div
                v-else-if="tab === 'VideoGenFlow'"
                data-auto-test-id="dh-VideoGenFlow"
            >
                <VideoGenFlow />
            </div>
        </div>
    </div>
</template>
