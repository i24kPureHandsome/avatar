import { MP4Clip, OffscreenSprite } from "@webav/av-cliper";
import { webavCombinator, webavWriteStream } from "../../../lib/webav";
import { TaskService } from "../../../service/TaskService";

export type VideoZoomOption = {
    bizId: string;
    video: string;
    times: {
        startMs: number;
        endMs: number;
        x: number;
        y: number;
        width: number;
        height: number;
    }[];
    width: number;
    height: number;
    fps: number;
    zoomDurationMs: number;
};

export async function videoZoomExecute(
    option: VideoZoomOption,
): Promise<string> {
    const outputFile = await $mapi.file.temp("mp4");
    const clip = new VideoZoomVideoClip(option);
    await clip.ready;
    const sprite = new OffscreenSprite(clip as any);
    const com = webavCombinator({
        width: option.width,
        height: option.height,
    });
    await com.addSprite(sprite, { main: true });
    await webavWriteStream(outputFile, com);
    return outputFile;
}

class VideoZoomVideoClip {
    #cvsEl: any;
    #ctx: any;
    #mp4Clip: any;
    #option: VideoZoomOption;
    #duration: number;
    #timeUs: number;
    #transforms: {
        startUs: number;
        x: number;
        y: number;
        width: number;
        height: number;
    }[];

    ready: any;

    get meta() {
        return {
            width: this.#cvsEl.width,
            height: this.#cvsEl.height,
            duration: this.#duration * 1e6,
        };
    }

    constructor(option: VideoZoomOption) {
        this.#option = option;
        this.#cvsEl = document.createElement("canvas");
        this.#cvsEl.width = option.width;
        this.#cvsEl.height = option.height;
        this.#ctx = this.#cvsEl.getContext("2d")!;
        this.#transforms = [];
        this.#duration = 0;
        this.#timeUs = 0;
        this.ready = new Promise(async (resolve, reject) => {
            try {
                const meta = await this.init();
                resolve(meta);
            } catch (e) {
                reject(e);
            }
        });
    }

    buildTransform() {
        let startUs = 0;
        for (const t of this.#option.times) {
            const s = Math.floor(t.startMs * 1000);
            if (s > startUs) {
                this.#transforms.push({
                    startUs,
                    x: 0,
                    y: 0,
                    width: this.#option.width,
                    height: this.#option.height,
                });
            }
            this.#transforms.push({
                startUs: s,
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height,
            });
            startUs = Math.floor(t.endMs * 1000);
        }
        if (startUs < this.#timeUs) {
            this.#transforms.push({
                startUs,
                x: 0,
                y: 0,
                width: this.#option.width,
                height: this.#option.height,
            });
        }
        // 优化：如果两个相邻的数据间距小于 zoomDurationMs，则使用后一个数据，忽略前一个数据
        const zoomDurationUs = Math.floor(this.#option.zoomDurationMs * 1000);
        const optimizedTransforms: any[] = [];
        for (let i = 0; i < this.#transforms.length; i++) {
            if (i === 0) {
                optimizedTransforms.push(this.#transforms[i]);
            } else {
                const prev =
                    optimizedTransforms[optimizedTransforms.length - 1];
                const curr = this.#transforms[i];
                if (curr.startUs - prev.startUs < zoomDurationUs) {
                    // 忽略前一个数据，使用后一个数据
                    optimizedTransforms[optimizedTransforms.length - 1] = curr;
                } else {
                    optimizedTransforms.push(curr);
                }
            }
        }
        this.#transforms = optimizedTransforms;
        // console.log('transforms', {
        //     xx: this.#option.zoomDurationMs,
        //     zoomDurationUs,
        //     transforms: JSON.stringify(this.#transforms.map(t => {
        //         t.startMs = t.startUs / 1e6;
        //         return t
        //     }), null, 2)
        // });
        // throw "test";
    }

    async init() {
        const stream = await $mapi.file.readStream(this.#option.video, {
            isDataPath: false,
        });
        if (!stream) {
            throw new Error("Failed to read video stream");
        }
        this.#mp4Clip = new MP4Clip(stream);
        await this.#mp4Clip.ready;
        this.#timeUs = this.#mp4Clip.meta.duration;
        this.#duration = this.#mp4Clip.meta.duration / 1e6;
        this.buildTransform();
        return {
            width: this.#option.width,
            height: this.#option.height,
            duration: this.#duration * 1e6,
        };
    }

    async tick(time: number): Promise<{
        state: "success" | "done";
        video?: VideoFrame;
        audio?: AudioData;
    }> {
        TaskService.cancelCheck("VideoZoom", this.#option.bizId);
        TaskService.updatePercent(this.#option.bizId, time / this.#timeUs);
        const frame = await this.#mp4Clip.tick(time);
        if (time > this.#timeUs || !frame) {
            return { state: "done" };
        }
        // console.log('tick', {time, frame});

        // 找到当前时间对应的变换
        let currentTransform = this.#transforms[0];
        let nextTransform: typeof currentTransform | null = null;
        for (let i = 0; i < this.#transforms.length - 1; i++) {
            if (
                time >= this.#transforms[i].startUs &&
                time < this.#transforms[i + 1].startUs
            ) {
                currentTransform = this.#transforms[i];
                nextTransform = this.#transforms[i + 1];
                break;
            }
        }
        if (time >= this.#transforms[this.#transforms.length - 1].startUs) {
            currentTransform = this.#transforms[this.#transforms.length - 1];
            nextTransform = null;
        }

        let x = currentTransform.x;
        let y = currentTransform.y;
        let width = currentTransform.width;
        let height = currentTransform.height;

        // 如果有下一个变换，进行插值动画
        if (nextTransform) {
            const zoomDurationUs = Math.floor(
                this.#option.zoomDurationMs * 1000,
            );
            const transitionStartUs = nextTransform.startUs - zoomDurationUs;
            if (time >= transitionStartUs && time < nextTransform.startUs) {
                const elapsed = time - transitionStartUs;
                const progress = elapsed / zoomDurationUs;

                // 线性插值
                x =
                    currentTransform.x +
                    (nextTransform.x - currentTransform.x) * progress;
                y =
                    currentTransform.y +
                    (nextTransform.y - currentTransform.y) * progress;
                width =
                    currentTransform.width +
                    (nextTransform.width - currentTransform.width) * progress;
                height =
                    currentTransform.height +
                    (nextTransform.height - currentTransform.height) * progress;
            } else {
                // 使用当前变换的值
                x = currentTransform.x;
                y = currentTransform.y;
                width = currentTransform.width;
                height = currentTransform.height;
            }
        } else {
            // 使用当前变换的值
            x = currentTransform.x;
            y = currentTransform.y;
            width = currentTransform.width;
            height = currentTransform.height;
        }

        if (frame.video) {
            this.#ctx.fillStyle = "black";
            this.#ctx.clearRect(0, 0, this.#cvsEl.width, this.#cvsEl.height);
            this.#ctx.fillRect(0, 0, this.#cvsEl.width, this.#cvsEl.height);

            // 确保缩放后的区域不超出边界
            if (x < 0) x = 0;
            if (y < 0) y = 0;
            if (x + width > this.#option.width) width = this.#option.width - x;
            if (y + height > this.#option.height)
                height = this.#option.height - y;

            this.#ctx.drawImage(
                frame.video,
                x,
                y,
                width,
                height,
                0,
                0,
                this.#cvsEl.width,
                this.#cvsEl.height,
            );
            frame.video.close();
        }

        return {
            state: "success",
            video: new VideoFrame(this.#cvsEl, { timestamp: time }),
            audio:
                frame.audio && frame.audio.length > 0 ? frame.audio : undefined,
        };
    }

    async clone() {
        return new VideoZoomVideoClip(this.#option) as this;
    }

    destroy() {
        this.#cvsEl.remove();
    }
}
