<script setup lang="ts">
import SoundAsrFormView from "../../../Video/components/SoundAsrFormView.vue";

const props = defineProps<{
    data: {
        soundAsr?: SoundAsrParamType;
    };
}>();
</script>

<template>
    <SoundAsrFormView :data="props.data.soundAsr" />
</template>
