<script setup lang="ts">
import { ref } from "vue";
import { Dialog } from "../../../../lib/dialog";

const formData = ref({
    action: "remove" as "keep" | "remove",
});

type VideoKeepPartForm = {
    action: "keep" | "remove";
};

const getValue = async (): Promise<VideoKeepPartForm | undefined> => {
    const data: any = {};
    data.action = formData.value.action;
    if (!data.action) {
        Dialog.tipError("请选择操作类型");
        return;
    }
    return data;
};

const setValue = (data: Partial<VideoKeepPartForm>) => {
    if (data.action !== undefined) {
        formData.value.action = data.action;
    }
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-5">
            <a-tooltip :content="'操作类型'" mini>
                <icon-settings />
            </a-tooltip>
        </div>
        <div class="flex items-center gap-2">
            <a-radio-group v-model="formData.action">
                <a-radio value="remove">删除选中片段</a-radio>
                <a-radio value="keep">保留选中片段</a-radio>
            </a-radio-group>
        </div>
    </div>
</template>
