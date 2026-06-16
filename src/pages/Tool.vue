<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const TextCutVideo = defineAsyncComponent(
    () => import("./Apps/TextCutVideo/TextCutVideo.vue"),
);
</script>

<template>
    <div class="pb-device-container bg-white h-full relative select-none">
        <TextCutVideo />
    </div>
</template>

<style scoped></style>
