<script setup lang="ts">
import { ref } from "vue";

const formData = ref({
    transitionEffect: "none" as string,
    transitionDuration: 500 as number,
});

type VideoMergeForm = {
    transitionEffect: string;
    transitionDuration: number;
};

const getValue = async (): Promise<VideoMergeForm | undefined> => {
    const data: any = {};
    data.transitionEffect = formData.value.transitionEffect;
    data.transitionDuration = formData.value.transitionDuration;
    return data;
};

const setValue = (data: Partial<VideoMergeForm>) => {
    if (data.transitionEffect !== undefined) {
        formData.value.transitionEffect = data.transitionEffect;
    }
    if (data.transitionDuration !== undefined) {
        formData.value.transitionDuration = data.transitionDuration;
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
            <a-tooltip :content="'转场特效'" mini>
                <icon-play-arrow />
                转场特效
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-select v-model="formData.transitionEffect" style="width: 120px">
                <a-option value="none">无</a-option>
                <a-option value="fade">淡入淡出</a-option>
                <a-option value="wipeleft">左擦除</a-option>
                <a-option value="wiperight">右擦除</a-option>
                <a-option value="slideleft">左滑动</a-option>
                <a-option value="slideright">右滑动</a-option>
                <a-option value="dissolve">溶解</a-option>
            </a-select>
        </div>
    </div>
    <div
        v-if="formData.transitionEffect && formData.transitionEffect !== 'none'"
        class="mb-4 flex items-start"
    >
        <div class="pt-1 w-32">
            <a-tooltip :content="'转场时长'" mini>
                <icon-clock-circle />
                转场时长
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-input-number
                v-model="formData.transitionDuration"
                :min="100"
                :max="5000"
                :step="100"
                suffix="ms"
                style="width: 120px"
            />
            ms
        </div>
    </div>
</template>
