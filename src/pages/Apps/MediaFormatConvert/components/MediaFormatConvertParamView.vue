<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
    data: {
        targetFormat?: string;
        videoCodec?: string;
        audioCodec?: string;
        videoBitrate?: number;
        audioBitrate?: number;
        lossless?: boolean;
    };
}>();

const videoCodecMap = {
    libx264: "H.264",
    libx265: "H.265/HEVC",
    "libvpx-vp9": "VP9",
};

const audioCodecMap = {
    aac: "AAC",
    libmp3lame: "MP3",
    libopus: "Opus",
    pcm_s16le: "PCM",
    flac: "FLAC",
};

const videoCodecText = computed(() => {
    const codec = props.data.videoCodec;
    return videoCodecMap[codec as keyof typeof videoCodecMap] || codec;
});

const audioCodecText = computed(() => {
    const codec = props.data.audioCodec;
    return audioCodecMap[codec as keyof typeof audioCodecMap] || codec;
});
</script>

<template>
    <div class="flex flex-wrap mb-2 gap-1">
        <a-tag class="rounded-lg"
            >格式：{{ data.targetFormat?.toUpperCase() || "未配置" }}</a-tag
        >
        <a-tag v-if="data.videoCodec && !data.lossless" class="rounded-lg"
            >视频编码：{{ videoCodecText }}</a-tag
        >
        <a-tag v-if="data.videoBitrate && !data.lossless" class="rounded-lg"
            >视频比特率：{{ data.videoBitrate }} kbps</a-tag
        >
        <a-tag v-if="data.audioCodec && !data.lossless" class="rounded-lg"
            >音频编码：{{ audioCodecText }}</a-tag
        >
        <a-tag v-if="data.audioBitrate && !data.lossless" class="rounded-lg"
            >音频比特率：{{ data.audioBitrate }} kbps</a-tag
        >
        <a-tag v-if="data.lossless !== undefined" class="rounded-lg">{{
            data.lossless ? "无损转换" : "有损转换"
        }}</a-tag>
    </div>
</template>
