import { ref, watch } from "vue";
import { defineStore } from "pinia";
import { VideoEditorMode, VideoEditorOption } from "../core/type";

export const usePageStore = defineStore("videoEditorPageState", () => {
    const mode = ref<VideoEditorMode>("");
    const option = ref<VideoEditorOption>({
        defaultRectSelectorDuration: 5,
    });

    const isDark = ref(false); //ref(Boolean(localStorage.theme) || true);
    const containerWidth = ref(window.innerWidth);
    const containerHeight = ref(window.innerHeight);
    const mainWidth = ref(window.innerWidth);
    const mainHeight = ref(window.innerHeight - 40);
    const settingWidth = ref(240);
    const trackHeight = ref(200);

    watch(
        () => [mainWidth.value, mainHeight.value],
        ([newW, newH]) => {
            settingWidth.value = Math.max(300, Math.floor(newW / 5));
            trackHeight.value = Math.max(200, Math.floor(newH / 5));
        },
        { immediate: true },
    );

    const reset = () => {};

    return {
        reset,

        mode,
        option,

        isDark,

        settingWidth,
        trackHeight,

        containerWidth,
        containerHeight,
        mainWidth,
        mainHeight,
    };
});
