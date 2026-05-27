<template>
    <a-color-picker :model-value="modelValue" @update:model-value="onUpdate" />
</template>

<script setup lang="ts">
const props = defineProps({
    modelValue: {
        type: String,
        default() {
            return "";
        },
    },
});
const emit = defineEmits({
    "update:modelValue": (val) => {
        return val !== null;
    },
});

function onUpdate(value: any) {
    emit("update:modelValue", value.hex);
}
</script>
