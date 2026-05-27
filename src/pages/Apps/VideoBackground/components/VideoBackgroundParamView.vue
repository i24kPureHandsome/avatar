<script setup lang="ts">
interface Props {
    value: {
        imageMode: "cover" | "contain";
        videoX: number;
        videoY: number;
        videoWidth: number;
        videoHeight: number;
        outputWidth: number;
        outputHeight: number;
        videoBorderWidth: number;
        videoBorderColor: string;
        videoBorderOpacity: number;
        videoBorderRadius: number;
    };
}

const props = defineProps<Props>();
</script>

<template>
    <div class="flex flex-wrap mb-2 gap-1">
        <a-tag class="rounded-lg"
            >背景图片模式
            {{ props.value.imageMode === "cover" ? "覆盖" : "适应" }}
        </a-tag>
        <a-tag class="rounded-lg"
            >视频位置 X {{ props.value.videoX }} Y
            {{ props.value.videoY }}</a-tag
        >
        <a-tag class="rounded-lg"
            >视频尺寸{{ props.value.videoWidth }}x{{ props.value.videoHeight }}
        </a-tag>
        <a-tag class="rounded-lg"
            >图片尺寸{{ props.value.outputWidth }}x{{
                props.value.outputHeight
            }}
            props.value.outputHeight }}
        </a-tag>
        <a-tag class="rounded-lg"
            >边框宽度:{{ props.value.videoBorderWidth }}</a-tag
        >
        <a-tag class="rounded-lg"
            >边框颜色:{{ props.value.videoBorderColor }}</a-tag
        >
        <a-tag class="rounded-lg"
            >边框透明度:{{ props.value.videoBorderOpacity }}%</a-tag
        >
        <a-tag class="rounded-lg"
            >边框圆角:{{ props.value.videoBorderRadius }}</a-tag
        >
    </div>
</template>
