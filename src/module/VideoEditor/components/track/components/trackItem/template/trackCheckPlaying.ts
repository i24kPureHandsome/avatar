import { usePlayerStore } from "../../../../../stores/player";
import { onBeforeUnmount, watchEffect } from "vue";
import { isEqual } from "lodash-es";

export default function setup(props: Record<string, any>) {
    const playerStore = usePlayerStore();
    watchEffect(() => {
        const trackItem = props.trackItem;
        if (
            playerStore.frameIndex >= trackItem.start &&
            playerStore.frameIndex <= trackItem.end
        ) {
            const oldPlayTargetTrackMap = playerStore.playTargetTrackMap.get(
                trackItem.id,
            );
            if (
                !oldPlayTargetTrackMap ||
                !isEqual(oldPlayTargetTrackMap, trackItem)
            ) {
                playerStore.playTargetTrackMap.set(trackItem.id, trackItem);
            }
        } else {
            playerStore.playTargetTrackMap.has(trackItem.id) &&
                playerStore.playTargetTrackMap.delete(trackItem.id);
        }
    });
    onBeforeUnmount(() => {
        playerStore.playTargetTrackMap.has(props.trackItem.id) &&
            playerStore.playTargetTrackMap.delete(props.trackItem.id);
    });
}
