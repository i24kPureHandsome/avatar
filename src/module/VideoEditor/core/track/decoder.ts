import { AudioClip, IClip, ImgClip, MP4Clip } from "@webav/av-cliper";
import { UnitFrame2us } from "./config";
import { VIDEO_PREVIEW_FIXED_FPS } from "../config";
import { writeFile } from "../opfs";
import { VideoTrackSource } from "./type";

abstract class BaseCustomDecoder {
    protected typeMap = new Map<string, string>();
    protected clipMap = new Map<string, IClip>();

    abstract reset(): void;

    abstract decode({
        id,
        stream,
        type,
    }: {
        id: string;
        stream?: ReadableStream<Uint8Array>;
        type?: string;
    }): Promise<IClip>;
}

class MockClip {
    meta: any = {};
    ready: Promise<void> = Promise.resolve();

    destroy() {}
}

class CustomVideoDecoder extends BaseCustomDecoder {
    #framesMap = new Map<
        string,
        {
            img: Blob;
            ts: number;
        }[]
    >();

    reset() {
        this.#framesMap.clear();
        this.clipMap.forEach((clip) => {
            clip.destroy();
        });
        this.clipMap.clear();
        this.typeMap.clear();
    }

    async decode({
        id,
        stream,
        format,
    }: {
        id: string;
        stream?: ReadableStream<Uint8Array>;
        format?: string;
    }): Promise<MP4Clip> {
        if (this.clipMap.has(id)) {
            return this.clipMap.get(id) as MP4Clip;
        }
        if (!format) {
            throw new Error("type is required");
        }
        this.typeMap.set(id, format);
        stream = await writeFile(id, stream);
        const clip = new MP4Clip(stream);
        await clip.ready;
        this.clipMap.set(id, clip);
        return clip;
    }

    async thumbnails(source: VideoTrackSource) {
        if (this.#framesMap.has(source.id)) {
            return this.#framesMap.get(source.id);
        }
        const clip = await this.decode({ id: source.id! });
        const thumbnails = await clip.thumbnails(50, { step: 1e6 });
        this.#framesMap.set(source.id!, thumbnails);
        return thumbnails;
    }

    async getFrame(id: string, frameIndex: number) {
        let clip = this.clipMap.get(id);
        if (!clip) {
            clip = await this.decode({ id });
        }
        // tick根据时间获取帧，可能存在这一时间帧为空的情况，修改为在范围内寻找帧
        // 前几帧可能为空，所以限定最小时间为5/30秒
        let time = Math.max(
            ((frameIndex - 1) / VIDEO_PREVIEW_FIXED_FPS) * 1e6,
            (5 / VIDEO_PREVIEW_FIXED_FPS) * 1e6,
        );
        let frame = await (clip as MP4Clip).tick(time);
        // console.log('CustomVideoDecoder.getFrame', {id, frameIndex, time, frame, video: frame.video});
        return frame.video;
    }
}

class CustomImageDecoder extends BaseCustomDecoder {
    #framesMap = new Map<string, VideoFrame[]>();

    reset() {
        this.#framesMap.forEach((frames) => {
            frames.forEach((frame) => {
                try {
                    frame.close();
                } catch (_) {}
            });
        });
        this.#framesMap.clear();
        this.clipMap.forEach((clip) => {
            clip.destroy();
        });
        this.clipMap.clear();
        this.typeMap.clear();
    }

    async decode({
        id,
        stream,
        format,
    }: {
        id: string;
        stream?: ReadableStream<Uint8Array>;
        format?: string;
    }): Promise<ImgClip> {
        if (this.clipMap.has(id)) {
            return this.clipMap.get(id) as ImgClip;
        }
        if (!format) {
            throw new Error("type is required");
        }
        this.typeMap.set(id, format);
        stream = await writeFile(id, stream);
        let clip: ImgClip;
        if (format === "image/svg+xml") {
            // svg不支持ImgClip，直接返回空的clip
            clip = new MockClip() as any as ImgClip;
        } else {
            clip = new ImgClip(stream);
        }
        await clip.ready;
        this.clipMap.set(id, clip);
        const { frames, width, height, duration } =
            await this._decodeFrames(id);
        clip.meta.duration = duration;
        clip.meta.width = width;
        clip.meta.height = height;
        // console.log('frames', {clip, id, type, width, height, frames, duration});
        this.#framesMap.set(id, frames);
        return clip;
    }

    async #decodeSvg(stream: ReadableStream<Uint8Array>): Promise<{
        width: number;
        height: number;
        duration: number;
        frames: VideoFrame[];
    }> {
        const textDecoder = new TextDecoder();
        const reader = stream.getReader();
        let result = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += textDecoder.decode(value, { stream: true });
        }
        result += textDecoder.decode();
        const svgBlob = new Blob([result], { type: "image/svg+xml" });
        const img = new Image();
        const url = URL.createObjectURL(svgBlob);
        img.src = url;
        await new Promise((resolve, reject) => {
            img.onload = () => resolve(true);
            img.onerror = (e) => reject(e);
        });
        URL.revokeObjectURL(url);
        const width = img.width;
        const height = img.height;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("get canvas context failed");
        }
        ctx.drawImage(img, 0, 0, width, height);
        const bitmap = await createImageBitmap(canvas);
        const frame = new VideoFrame(bitmap, { timestamp: 0 });
        bitmap.close();
        return {
            width,
            height,
            duration: 5 * 1e6,
            frames: [frame],
        };
    }

    async #decodeGif(stream: ReadableStream<Uint8Array>): Promise<{
        width: number;
        height: number;
        duration: number;
        frames: VideoFrame[];
    }> {
        const init = {
            type: "image/gif",
            data: stream,
        };
        const imageDecoder = new ImageDecoder(init);
        const frames: VideoFrame[] = [];
        const { image, complete } = await imageDecoder.decode({
            frameIndex: 0,
        });
        // @ts-ignore
        const width = image.width;
        // @ts-ignore
        const height = image.height;
        let duration = 5;
        frames.push(image);
        let frameCnt = imageDecoder.tracks.selectedTrack?.frameCount ?? 1;
        if (complete && frameCnt === 1) {
            // do nothing
        } else {
            let i = 1;
            while (i < frameCnt) {
                const { image } = await imageDecoder.decode({ frameIndex: i });
                frameCnt = imageDecoder.tracks.selectedTrack?.frameCount ?? i;
                i += 1;
                frames.push(image);
            }
            // @ts-ignore
            duration =
                (imageDecoder.tracks.selectedTrack?.duration ??
                    frames.length * 0.1) * 1e6;
        }
        return {
            width,
            height,
            duration,
            frames,
        };
    }

    async _decodeFrames(id: string): Promise<{
        width: number;
        height: number;
        duration: number;
        frames: VideoFrame[];
    }> {
        const type = this.typeMap.get(id);
        if (!type) {
            throw new Error("get type failed from map");
        }
        // only gif need decode frames
        if (type === "image/gif") {
            return this.#decodeGif(await writeFile(id));
        } else if (type === "image/svg+xml") {
            return this.#decodeSvg(await writeFile(id));
        }
        const clip = this.clipMap.get(id);
        if (!clip) {
            throw new Error("get clip failed from map");
        }
        const frame = await clip.tick(0);
        if (!frame || !frame.video) {
            throw new Error("get image failed from clip");
        }
        return {
            width: clip.meta.width,
            height: clip.meta.height,
            frames: [frame.video as any],
            duration: 5 * 1e6,
        };
    }

    async getFrame(type: string, id: string, frameIndex: number) {
        let frames = this.#framesMap.get(id);
        return frames?.[frameIndex % frames.length];
    }
}

class CustomAudioDecoder extends BaseCustomDecoder {
    reset() {
        this.clipMap.forEach((clip) => {
            clip.destroy();
        });
        this.clipMap.clear();
        this.typeMap.clear();
    }

    async decode({
        id,
        stream,
        format,
    }: {
        id: string;
        stream?: ReadableStream<Uint8Array>;
        format?: string;
    }): Promise<AudioClip> {
        if (this.clipMap.has(id)) {
            return this.clipMap.get(id) as AudioClip;
        }
        if (!format) {
            throw new Error("type is required");
        }
        this.typeMap.set(id, format);
        stream = await writeFile(id, stream);
        const clip = new AudioClip(stream);
        await clip.ready;
        this.clipMap.set(id, clip);
        return clip;
    }
}

export const splitClip = async (
    source: IClip,
    {
        offsetL,
        offsetR,
        frameCount,
    }: {
        offsetL: number;
        offsetR: number;
        frameCount: number;
    },
) => {
    if (offsetL === 0 && offsetR === 0) {
        return source;
    }
    const start = offsetL * UnitFrame2us;
    // @ts-ignore
    const clip = offsetL === 0 ? source : (await source!.split(start))[1];
    const end = (frameCount - offsetR - offsetL) * UnitFrame2us;
    // @ts-ignore
    return offsetR === 0 ? clip : (await clip!.split(end))[0];
};

export const videoDecoder = new CustomVideoDecoder();

export const imageDecoder = new CustomImageDecoder();

export const audioDecoder = new CustomAudioDecoder();
