<template>
    <div class="flex w-80 h-full overflow-hidden relative border-r">
        <div class="w-24 border-r flex-shrink-0 p-2">
            <a-button
                :type="current === 'video' ? 'primary' : undefined"
                class="w-full mb-2"
                @click="current = 'video'"
            >
                <template #icon>
                    <icon-video-camera />
                </template>
                视频
            </a-button>
            <a-button
                :type="current === 'audio' ? 'primary' : undefined"
                class="w-full mb-2"
                @click="current = 'audio'"
            >
                <template #icon>
                    <icon-music />
                </template>
                音频
            </a-button>
            <a-button
                :type="current === 'image' ? 'primary' : undefined"
                class="w-full mb-2"
                @click="current = 'image'"
            >
                <template #icon>
                    <icon-image />
                </template>
                图片
            </a-button>
            <a-button
                :type="current === 'text' ? 'primary' : undefined"
                class="w-full mb-2"
                @click="current = 'text'"
            >
                <template #icon>
                    <icon-file />
                </template>
                文字
            </a-button>
        </div>
        <div class="flex-grow overflow-y-auto">
            <div>
                <div class="p-2">
                    <div class="mb-2">
                        <a-button class="w-full" @click="doUpload">
                            <template #icon>
                                <icon-upload />
                            </template>
                            上传本地
                        </a-button>
                    </div>
                    <div class="text-xs text-gray-500 text-center">
                        支持格式：视频（mp4）音频（mp3、wav）图片（jpg、png、gif）
                    </div>
                </div>
            </div>
            <VideoPanel v-if="current === 'video'" />
            <AudioPanel v-if="current === 'audio'" />
            <ImagePanel v-if="current === 'image'" />
            <TextPanel v-if="current === 'text'" />
        </div>
        <!--        <MenuList :selected="selected.key" @toggle="onChangeSelect"/>-->
        <!--        <ItemList-->
        <!--            :activeKey="selected.key"-->
        <!--            :defaultCollapse="store.hideSubMenu"-->
        <!--            :title="selected.title"-->
        <!--            @collapseChange="changeCollapse"-->
        <!--        />-->
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { doOpenBrowserFile } from "../../../../../components/common/util";
import { useTrackStore } from "../../../stores/track";
import AudioPanel from "./AudioResPanel.vue";
import ImagePanel from "./ImageResPanel.vue";
import VideoPanel from "./VideoResPanel.vue";
import TextPanel from "./text/TextResPanel.vue";

const current = ref<string>("video");
const trackStore = useTrackStore();

const doUpload = async () => {
    const file = await doOpenBrowserFile({
        accept: ".mp4,.mp3,.wav,.png,.jpg,.svg",
        multiple: false,
    });
    if (file) {
        await trackStore.addTrackFromFile(file);
    }
};
</script>
