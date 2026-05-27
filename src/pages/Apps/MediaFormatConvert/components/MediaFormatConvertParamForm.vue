<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Dialog } from "../../../../lib/dialog";

const formData = ref({
    targetFormat: "mp4",
    videoCodec: "libx264",
    audioCodec: "aac",
    videoBitrate: 2000,
    audioBitrate: 128,
    lossless: false,
});

type MediaFormatConvertForm = {
    targetFormat: string;
    videoCodec: string;
    audioCodec: string;
    videoBitrate: number;
    audioBitrate: number;
    lossless: boolean;
};

const formatOptions = [
    {
        label: "MP4 (H.264)",
        format: "mp4",
        videoCodec: "libx264",
        audioCodec: "aac",
    },
    {
        label: "MP4 (H.265/HEVC)",
        format: "mp4",
        videoCodec: "libx265",
        audioCodec: "aac",
    },
    {
        label: "WebM (VP9)",
        format: "webm",
        videoCodec: "libvpx-vp9",
        audioCodec: "libopus",
    },
    {
        label: "MKV (H.264)",
        format: "mkv",
        videoCodec: "libx264",
        audioCodec: "aac",
    },
    {
        label: "MP3 (音频)",
        format: "mp3",
        videoCodec: "",
        audioCodec: "libmp3lame",
    },
    { label: "AAC (音频)", format: "aac", videoCodec: "", audioCodec: "aac" },
    {
        label: "WAV (音频)",
        format: "wav",
        videoCodec: "",
        audioCodec: "pcm_s16le",
    },
    {
        label: "FLAC (音频)",
        format: "flac",
        videoCodec: "",
        audioCodec: "flac",
    },
];

const selectedFormat = ref<string>(formatOptions[0].label);

const updateFormat = () => {
    const format = formatOptions.find(
        (f) =>
            f.format === formData.value.targetFormat &&
            f.videoCodec === formData.value.videoCodec &&
            f.audioCodec === formData.value.audioCodec,
    );
    selectedFormat.value = format ? format.label : "";
};

const onFormatChange = (value: string) => {
    const format = formatOptions.find((f) => f.label === value);
    if (format) {
        formData.value.targetFormat = format.format;
        if (!formData.value.lossless) {
            formData.value.videoCodec = format.videoCodec;
            formData.value.audioCodec = format.audioCodec;
        }
    }
};

onMounted(() => {
    updateFormat();
});

const getValue = async (): Promise<MediaFormatConvertForm | undefined> => {
    const data: any = {};
    data.targetFormat = formData.value.targetFormat;
    data.videoCodec = formData.value.videoCodec;
    data.audioCodec = formData.value.audioCodec;
    data.videoBitrate = formData.value.videoBitrate;
    data.audioBitrate = formData.value.audioBitrate;
    data.lossless = formData.value.lossless;

    if (!data.targetFormat) {
        Dialog.tipError("请选择目标格式");
        return;
    }
    if (!data.lossless) {
        if (data.videoBitrate < 0 || isNaN(data.videoBitrate)) {
            Dialog.tipError("请设置有效的视频比特率");
            return;
        }
        if (data.audioBitrate < 0 || isNaN(data.audioBitrate)) {
            Dialog.tipError("请设置有效的音频比特率");
            return;
        }
    }
    return data;
};

const setValue = (data: Partial<MediaFormatConvertForm>) => {
    if (data.targetFormat !== undefined) {
        formData.value.targetFormat = data.targetFormat;
    }
    if (data.videoCodec !== undefined) {
        formData.value.videoCodec = data.videoCodec;
    }
    if (data.audioCodec !== undefined) {
        formData.value.audioCodec = data.audioCodec;
    }
    if (data.videoBitrate !== undefined) {
        formData.value.videoBitrate = data.videoBitrate;
    }
    if (data.audioBitrate !== undefined) {
        formData.value.audioBitrate = data.audioBitrate;
    }
    if (data.lossless !== undefined) {
        formData.value.lossless = data.lossless;
    }
    updateFormat();
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <div class="flex items-start mb-3">
        <div class="pt-1 w-5">
            <a-tooltip :content="'目标格式'" mini>
                <icon-file />
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-select
                v-model="selectedFormat"
                placeholder="选择目标格式"
                style="width: 200px"
                @change="onFormatChange"
            >
                <a-option
                    v-for="format in formatOptions"
                    :key="format.label"
                    :value="format.label"
                >
                    {{ format.label }}
                </a-option>
            </a-select>
        </div>
    </div>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-5">
            <a-tooltip :content="'无损转换'" mini>
                <icon-check-circle />
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-checkbox v-model="formData.lossless"> 无损转换 </a-checkbox>
        </div>
    </div>
    <div v-if="!formData.lossless" class="mb-4 flex items-start">
        <div class="pt-1 w-5">
            <a-tooltip :content="'视频比特率'" mini>
                <icon-video-camera />
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-input-number
                v-model="formData.videoBitrate"
                :min="0"
                :max="20000"
                :step="100"
                placeholder="视频比特率 (kbps)"
                style="width: 200px"
                :disabled="formData.lossless"
            />
            <span>kbps</span>
        </div>
    </div>
    <div v-if="!formData.lossless" class="mb-4 flex items-start">
        <div class="pt-1 w-5">
            <a-tooltip :content="'音频比特率'" mini>
                <icon-file />
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-input-number
                v-model="formData.audioBitrate"
                :min="0"
                :max="320"
                :step="16"
                placeholder="音频比特率 (kbps)"
                style="width: 200px"
                :disabled="formData.lossless"
            />
            <span>kbps</span>
        </div>
    </div>
</template>
