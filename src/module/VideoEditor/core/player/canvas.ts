import type { Ref } from "vue";
import { onMounted, toRaw, watch } from "vue";
import { usePlayerStore } from "../../stores/player";
import { useTrackStore } from "../../stores/track";

export class PlayerCanvas {
    player: Ref<HTMLCanvasElement>; // 播放器
    playerContext: ImageBitmapRenderingContext | null = null;
    playerStore: ReturnType<typeof usePlayerStore>;
    trackStore: ReturnType<typeof useTrackStore>;
    containerSize: Record<string, any>;

    constructor(options: Record<string, any>) {
        this.player = options.player;
        this.containerSize = options.containerSize;

        onMounted(() => {
            this.playerContext = this.player.value.getContext("bitmaprenderer");
        });

        this.playerStore = usePlayerStore();
        this.trackStore = useTrackStore();
        this.initWatch();
    }

    initWatch() {
        watch(
            [
                () => this.trackStore.trackList,
                () => this.playerStore.frameIndex,
                () => this.playerStore.canvasWidth,
                () => this.playerStore.canvasHeight,
            ],
            () => this.drawCanvas(),
            { deep: true },
        );
    }

    // getCanvasRect() {
    //     let { width, height } = this.containerSize;
    //     height -= 96; // 上下功能栏
    //     width -= 16; // 左右功能栏
    //     const { canvasWidth, canvasHeight } = this.playerStore;
    //     const scaleWidth = canvasWidth !== 0 ? Math.floor(height / canvasHeight * canvasWidth) : width; // 等高情况下的宽度
    //     const scaleHeight = canvasHeight !== 0 ? Math.floor(width / canvasWidth * canvasHeight) : height; // 等宽情况啊下的高度
    //     const canvasWidth = Math.min(scaleWidth, width);
    //     const canvasHeight = Math.min(scaleHeight, height);

    //     return { canvasWidth, canvasHeight };
    // }
    // 更新尺寸
    // updateCanvasSize() {
    //     /**
    //      * 希望实际尺寸为正常手机的尺寸，1920*1080，较大尺寸
    //      * 但是在画布上展示时，不需要这么大尺寸，会对渲染性能有影响
    //      * 所以画布尺寸还是按照实际展示尺寸来计算，最终生成时，再使用1920*1080
    //      */
    //     const { canvasWidth, canvasHeight } = this.getCanvasRect();
    //     if (this.canvasSize.width !== canvasWidth || this.canvasSize.height !== canvasHeight) {
    //         this.canvasSize.width = canvasWidth;
    //         this.canvasSize.height = canvasHeight;
    //         // 设置实际画布尺寸
    //         this.player.value.width = canvasWidth;
    //         this.player.value.height = canvasHeight;

    //         // 将画板宽高存储到playerState中
    //         this.playerStore.canvasOptions = { width: canvasWidth, height: canvasHeight };
    //     }
    // }
    // 绘制
    async drawCanvas() {
        if (this.playerStore.loadingItemCount !== 0) {
            return;
        }
        const offCanvas = new OffscreenCanvas(
            this.playerStore.canvasWidth,
            this.playerStore.canvasHeight,
        );
        const ctx = offCanvas.getContext("2d");
        const videoList: Array<any> = [];
        this.trackStore.trackList.forEach(({ list }) => {
            const trackItem = list.find((item: Record<string, any>) => {
                if (
                    this.playerStore.frameIndex >= item.start &&
                    this.playerStore.frameIndex <= item.end &&
                    !["audio"].includes(item.type)
                ) {
                    return true;
                }
                return false;
            });
            trackItem &&
                videoList.unshift(() =>
                    this.drawToRenderCanvas(
                        ctx!,
                        trackItem,
                        this.playerStore.frameIndex,
                    ),
                );
        });
        await videoList.reduce(
            (chain, nextPromise) => chain.then(() => nextPromise()),
            Promise.resolve(),
        ); // 顺序绘制，保证视频在底部
        await this.drawToPlayerCanvas(offCanvas);
    }

    // 预渲染canvas先加载
    drawToRenderCanvas(
        ctx: OffscreenCanvasRenderingContext2D,
        trackItem: Record<string, any>,
        frameIndex: number,
    ) {
        return toRaw(trackItem)
            .draw(
                ctx,
                {
                    width: this.playerStore.canvasWidth,
                    height: this.playerStore.canvasHeight,
                },
                frameIndex,
            )
            .then(() => {
                return true;
            });
    }

    // 将预渲染好的canvas进行渲播放器渲染
    async drawToPlayerCanvas(canvas: OffscreenCanvas) {
        if (this.playerContext) {
            this.playerContext.transferFromImageBitmap(
                canvas.transferToImageBitmap(),
            );
        }
    }
}
