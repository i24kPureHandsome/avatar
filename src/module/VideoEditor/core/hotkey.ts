import { useTrackStore } from "../stores/track";
import { onBeforeUnmount, onMounted } from "vue";

export const initHotKey = () => {
    const store = useTrackStore();
    const onKeyDown = (event: KeyboardEvent) => {
        // 判断按键是否在输入框中
        let activeElement = document.activeElement;
        if (
            activeElement &&
            (["input", "textarea"].includes(
                activeElement.tagName.toLowerCase(),
            ) ||
                (activeElement as HTMLElement).isContentEditable)
        ) {
            return;
        }
        const { composed, ctrlKey, key, type } = event;
        switch (key) {
            case "Backspace":
                // 删除操作
                if (
                    store.selectTrackItem.line !== -1 &&
                    store.selectTrackItem.index !== -1
                ) {
                    store.removeTrack(
                        store.selectTrackItem.line,
                        store.selectTrackItem.index,
                    );
                    store.selectTrackItem.line = -1;
                    store.selectTrackItem.index = -1;
                }
                break;
            case "Enter":
                break;
            default:
                break;
        }
    };
    onMounted(() => {
        window.addEventListener("keydown", onKeyDown);
    });
    onBeforeUnmount(() => {
        window.removeEventListener("keydown", onKeyDown);
    });
};
