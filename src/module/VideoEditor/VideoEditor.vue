<template>
    <div
        v-if="loading"
        class="h-full select-none flex overflow-hidden items-center justify-center"
    >
        <div class="text-center">
            <div>
                <icon-video-camera class="text-5xl text-gray-400" />
            </div>
            <div class="text-gray-400">
                <icon-loading />
                加载中...
            </div>
        </div>
    </div>
    <div v-else class="h-full flex overflow-hidden" :ref="onContainerMounted">
        <div class="h-full">
            <MaterialResContainer v-if="mode === 'editor'" />
        </div>
        <div class="flex flex-1 flex-col overflow-hidden" :ref="onMainMounted">
            <div class="flex flex-1 flex-row flex-nowrap">
                <PlayerContainer />
                <SettingContainer />
            </div>
            <TrackContainer />
        </div>
    </div>
</template>

<script setup lang="ts">
import SettingContainer from "./components/setting/SettingContainer.vue";
import PlayerContainer from "./components/player/PlayerContainer.vue";
import MaterialResContainer from "./components/res/material/MaterialResContainer.vue";
import TrackContainer from "./components/track/TrackContainer.vue";
import { initHotKey } from "./core/hotkey";
import { nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from "vue";
import {
    RequireSome,
    VideoEditorData,
    VideoEditorMode,
    VideoEditorOption,
    VideoEditorTrack,
} from "./core/type";
import { usePageStore } from "./stores/page";
import { useTrackStore } from "./stores/track";
import { usePlayerStore } from "./stores/player";
import {
    AllTrackSource,
    AudioTrackSource,
    BaseTrackItemOption,
    ImageTrackSource,
    TextTrackSource,
    TrackAddType,
    VideoTrackSource,
} from "./core/track/type";

const props = defineProps<{
    mode: VideoEditorMode;
    option?: VideoEditorOption;
}>();

const trackStore = useTrackStore();
const pageStore = usePageStore();
const playerStore = usePlayerStore();
const loading = ref(true);

watch(
    () => props.option,
    (newVal) => {
        pageStore.option = Object.assign({}, pageStore.option, newVal || {});
    },
    { immediate: true, deep: true },
);

onMounted(() => {
    pageStore.mode = props.mode || "";
    initHotKey();
    setTimeout(() => {
        loading.value = false;
    }, 1000);
});
onBeforeUnmount(async () => {
    await pageStore.reset();
    await trackStore.reset();
    await playerStore.reset();
});
const onContainerMounted = (el: any) => {
    if (el) {
        pageStore.containerWidth = el.clientWidth;
        pageStore.containerHeight = el.clientHeight;
    }
};
const onMainMounted = (el: any) => {
    if (el) {
        nextTick(() => {
            pageStore.mainWidth = el.clientWidth;
            pageStore.mainHeight = el.clientHeight;
        });
    }
};

/**
 * example
 */

///// setting
// const {width, height, fps} = await ffprobeVideoInfo('/path/to/video.mp4')
// await videoEditor.value.setSetting({
//     width, height, fps,
// });

///// data load & save
// setInterval(async () => {
//     const data = await videoEditor.value?.getData();
//     console.log('data', data);
//     await window.$mapi.file.write('VideoEditorDemo.json', JSON.stringify(data, null, 4));
// }, 5000);
// const json = await window.$mapi.file.read('VideoEditorDemo.backup.json');
// if (json) {
//     const data = JSON.parse(json);
//     await videoEditor.value.setData(data);
// }

defineExpose({
    setSetting: async (setting: {
        width: number;
        height: number;
        fps: number;
    }) => {
        playerStore.playerWidth = setting.width;
        playerStore.playerHeight = setting.height;
        playerStore.frameRate = setting.fps;
    },
    addImageTrack: async (
        source: RequireSome<ImageTrackSource, "url" | "name" | "format">,
        stream: ReadableStream | string,
        option: BaseTrackItemOption = {},
    ) => {
        await trackStore.addImageTrack(source, stream, option);
    },
    addVideoTrack: async (
        source: RequireSome<VideoTrackSource, "url" | "name" | "format">,
        stream: ReadableStream | string,
        option: BaseTrackItemOption = {},
    ) => {
        await trackStore.addVideoTrack(source, stream, option);
    },
    addAudioTrack: async (
        source: RequireSome<AudioTrackSource, "url" | "name" | "format">,
        stream: ReadableStream | string,
        option: BaseTrackItemOption = {},
    ) => {
        await trackStore.addAudioTrack(source, stream, option);
    },
    addTextTrack: async (
        source: TextTrackSource,
        option: BaseTrackItemOption = {},
    ) => {
        await trackStore.addTextTrack(source, option);
    },
    addTrackFromPath: async (
        source: Partial<AllTrackSource>,
        path: string,
        option: BaseTrackItemOption = {},
    ) => {
        await trackStore.addTrackFromPath(source, path, option);
    },
    addTrackFromFile: async (
        source: Partial<AllTrackSource>,
        file: File,
        option: BaseTrackItemOption = {},
    ) => {
        await trackStore.addTrackFromFile(source, file, option);
    },
    addTrackFromBuildIn: async (
        source: Partial<AllTrackSource>,
        type: TrackAddType,
        option: BaseTrackItemOption = {},
    ) => {
        await trackStore.addTrackFromBuildIn(source, type, option);
    },
    getData: async (): Promise<VideoEditorData> => {
        const tracks: VideoEditorTrack[] = toRaw(trackStore.trackList) as any;
        tracks.forEach((t) => {
            if (["video", "image", "text"].includes(t.type)) {
                t.list.forEach((i) => {
                    let width = (i.width * i.scaleX) / 100;
                    let height = (i.height * i.scaleY) / 100;
                    let x = i.centerX + playerStore.canvasWidth / 2 - width / 2;
                    let y =
                        i.centerY + playerStore.canvasHeight / 2 - height / 2;
                    // canvas to player
                    x = Math.floor(playerStore.canvasToPlayer(x));
                    y = Math.floor(playerStore.canvasToPlayer(y));
                    width = Math.floor(playerStore.canvasToPlayer(width));
                    height = Math.floor(playerStore.canvasToPlayer(height));
                    i.rect = { x, y, width, height };
                });
            }
        });
        return {
            setting: {
                width: playerStore.playerWidth,
                height: playerStore.playerHeight,
                fps: playerStore.frameRate,
            },
            tracks,
        };
    },
    setData: async (data: VideoEditorData) => {
        // console.log('setData', data);
        if (data.setting) {
            playerStore.unready();
            playerStore.playerWidth = data.setting.width;
            playerStore.playerHeight = data.setting.height;
            playerStore.frameRate = data.setting.fps;
            await playerStore.waitReady();
        }
        if (data.tracks && data.tracks.length) {
            await trackStore.setData(data.tracks);
        }
    },
});
</script>
