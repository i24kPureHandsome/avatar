<template>
    <div class="p-2">
        <a-button class="w-full" @click="addTrackItem({ fill: '#fff' })">
            添加文字
        </a-button>
        <div>
            <div class="overflow-y-auto h-full pt-6 scrollbar-width-none">
                <TextTemplate @addText="addTrackItem" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from "../../../../stores/player";
import { useTrackStore } from "../../../../stores/track";
import TextTemplate from "./TextTemplate.vue";
import { TextTrackItem } from "../../../../core/track/item/TextTrackItem";
import { StringUtil } from "../../../../../../lib/util";

const trackStore = useTrackStore();
const playerStore = usePlayerStore();

function addTrackItem(style: {
    fill: string;
    stroke?: string;
    textBackgroundColor?: string;
}) {
    trackStore.addTrack(
        new TextTrackItem({
            id: StringUtil.random(32),
            start: playerStore.frameIndex,
            content: "文本内容",
            fontSize: 24,
            fontFamily: "Arial",
            ...style,
        }),
    );
}
</script>

<style scoped></style>
