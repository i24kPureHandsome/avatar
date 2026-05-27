<script setup lang="ts">
import { ref } from "vue";
import { Dialog } from "../../../../lib/dialog";

const formData = ref({
    codec: "libx264",
    resolution: "1920x1080",
    compressionLevel: 50,
});

type VideoCompressForm = {
    codec: string;
    resolution: string;
    compressionLevel: number;
};

const codecOptions = [
    { label: "H.264", value: "libx264" },
    { label: "H.265", value: "libx265" },
];

const resolutionOptions = [
    { label: "1920x1080 (16:9)", value: "1920x1080" },
    { label: "1280x720 (16:9)", value: "1280x720" },
    { label: "1080x1920 (9:16)", value: "1080x1920" },
    { label: "720x1280 (9:16)", value: "720x1280" },
];
const getValue = async (): Promise<VideoCompressForm | undefined> => {
    const data: any = {};
    data.codec = formData.value.codec;
    data.resolution = formData.value.resolution;
    data.compressionLevel = formData.value.compressionLevel;
    if (
        data.compressionLevel < 0 ||
        data.compressionLevel > 100 ||
        isNaN(data.compressionLevel)
    ) {
        Dialog.tipError("请设置有效的压缩程度（0-100）");
        return;
    }
    return data;
};

const setValue = (data: Partial<VideoCompressForm>) => {
    if (data.codec !== undefined) {
        formData.value.codec = data.codec;
    }
    if (data.resolution !== undefined) {
        formData.value.resolution = data.resolution;
    }
    if (data.compressionLevel !== undefined) {
        formData.value.compressionLevel = data.compressionLevel;
    }
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-32">
            <a-tooltip :content="'视频编码'" mini>
                <icon-video-camera />
                编码
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-select v-model="formData.codec" :style="{ width: '200px' }">
                <a-option
                    v-for="option in codecOptions"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </a-option>
            </a-select>
        </div>
    </div>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-32">
            <a-tooltip :content="'输出分辨率'" mini>
                <icon-desktop />
                分辨率
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-select v-model="formData.resolution" :style="{ width: '200px' }">
                <a-option
                    v-for="option in resolutionOptions"
                    :key="option.value"
                    :value="option.value"
                >
                    {{ option.label }}
                </a-option>
            </a-select>
        </div>
    </div>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-32">
            <a-tooltip :content="'压缩程度'" mini>
                <icon-shrink />
                压缩程度
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-slider
                v-model="formData.compressionLevel"
                :min="0"
                :max="100"
                :step="1"
                :style="{ width: '200px' }"
            />
            <span>{{ formData.compressionLevel }}%</span>
        </div>
    </div>
</template>
