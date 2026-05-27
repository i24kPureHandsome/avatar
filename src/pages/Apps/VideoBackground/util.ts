import { ImgClip, MP4Clip, OffscreenSprite } from "@webav/av-cliper";
import { webavCombinator, webavWriteStream } from "../../../lib/webav";
import { TaskService } from "../../../service/TaskService";

function toRgba(color: string, opacity: number): string {
    if (color.startsWith("rgba")) return color; // 已经是 rgba
    if (color.startsWith("rgb")) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
        }
    }
    if (color.startsWith("#")) {
        const hex = color.slice(1);
        let r, g, b;
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else {
            return color; // 无效
        }
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color; // 其他格式保持
}

type RoundVideoClipOption = {
    bizId: string;
    video: string;
    videoWidth: number;
    videoHeight: number;
    borderWidth: number;
    borderRadius: number;
};

class RoundVideoClip {
    #cvsEl;
    #ctx;
    #mp4Clip;
    #option;
    #duration;
    #timeUs;

    ready;

    get meta() {
        return {
            width: this.#cvsEl.width,
            height: this.#cvsEl.height,
            duration: this.#duration * 1e6,
        };
    }

    constructor(option: RoundVideoClipOption) {
        this.#option = option;
        this.#cvsEl = document.createElement("canvas");
        this.#cvsEl.width = option.videoWidth;
        this.#cvsEl.height = option.videoHeight;
        this.#ctx = this.#cvsEl.getContext("2d")!;
        this.ready = new Promise(async (resolve, reject) => {
            try {
                const meta = await this.init();
                resolve(meta);
            } catch (e) {
                reject(e);
            }
        });
    }

    async init() {
        const stream = await $mapi.file.readStream(this.#option.video);
        if (!stream) {
            throw new Error("Failed to read video stream");
        }
        this.#mp4Clip = new MP4Clip(stream);
        await this.#mp4Clip.ready;
        this.#timeUs = this.#mp4Clip.meta.duration;
        this.#duration = this.#mp4Clip.meta.duration / 1e6;
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
        const frame = await this.#mp4Clip.tick(time);
        const currentMs = time / 1e3;
        // console.log('tick', {currentMs, time, frame, bizId: this.#option.bizId});
        TaskService.cancelCheck("VideoBackground", this.#option.bizId);
        TaskService.updatePercent(this.#option.bizId, time / this.#timeUs);
        if (currentMs > this.#timeUs || !frame) {
            return { state: "done" };
        }
        if (this.#option.borderWidth < 1 || this.#option.borderRadius < 1) {
            return {
                state: "success",
                video: frame.video,
                audio:
                    frame.audio && frame.audio.byteLength > 0
                        ? frame.audio
                        : undefined,
            };
        }
        if (frame.video) {
            this.#ctx.clearRect(0, 0, this.#cvsEl.width, this.#cvsEl.height);
            this.#ctx.save();
            this.#ctx.beginPath();
            this.#ctx.roundRect(
                0,
                0,
                this.#cvsEl.width,
                this.#cvsEl.height,
                this.#option.borderRadius,
            );
            this.#ctx.clip();
            this.#ctx.drawImage(
                frame.video,
                0,
                0,
                this.#cvsEl.width,
                this.#cvsEl.height,
            );
            this.#ctx.restore();
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
        return new RoundVideoClip(this.#option) as this;
    }

    destroy() {
        this.#cvsEl.remove();
    }
}

export const videoBackgroundExecute = async (
    videoPath: string,
    imagePath: string,
    config: {
        bizId: string;
        imageMode: "cover" | "contain";
        videoX: number;
        videoY: number;
        videoWidth: number;
        videoHeight: number;
        outputWidth: number;
        outputHeight: number;
        videoBorderWidth: number;
        videoBorderColor: string;
        videoBorderOpacity: number;
        videoBorderRadius: number;
    },
): Promise<string> => {
    const outputFile = await $mapi.file.temp("mp4");

    console.log("VideoBackground.Execute", {
        videoPath,
        imagePath,
        config,
        outputFile,
    });

    // 读取文件流
    const videoStream = await $mapi.file.readStream(videoPath, {
        isDataPath: false,
    });
    if (!videoStream) {
        throw new Error("Failed to read video stream");
    }
    const imageStream = await $mapi.file.readStream(imagePath, {
        isDataPath: false,
    });
    if (!imageStream) {
        throw new Error("Failed to read image stream");
    }

    // 创建视频clip
    const videoClip = new RoundVideoClip({
        bizId: config.bizId,
        video: videoPath,
        videoWidth: config.videoWidth,
        videoHeight: config.videoHeight,
        borderWidth: config.videoBorderWidth,
        borderRadius: config.videoBorderRadius,
    });
    try {
        await videoClip.ready;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to initialize video clip: ${message}`);
    }

    // 创建图像clip
    const imgClip = new ImgClip(imageStream);
    try {
        await imgClip.ready;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to initialize image clip: ${message}`);
    }

    // 根据 imageMode 设置图像尺寸
    let imgWidth = config.outputWidth;
    let imgHeight = config.outputHeight;
    if (config.imageMode === "cover") {
        const imgAspect = imgClip.meta.width / imgClip.meta.height;
        const outputAspect = config.outputWidth / config.outputHeight;
        if (imgAspect > outputAspect) {
            imgHeight = config.outputHeight;
            imgWidth = imgHeight * imgAspect;
        } else {
            imgWidth = config.outputWidth;
            imgHeight = imgWidth / imgAspect;
        }
    } else if (config.imageMode === "contain") {
        const imgAspect = imgClip.meta.width / imgClip.meta.height;
        const outputAspect = config.outputWidth / config.outputHeight;
        if (imgAspect > outputAspect) {
            imgWidth = config.outputWidth;
            imgHeight = imgWidth / imgAspect;
        } else {
            imgHeight = config.outputHeight;
            imgWidth = imgHeight * imgAspect;
        }
    }

    // 创建sprite
    const imgSprite = new OffscreenSprite(imgClip);
    imgSprite.rect.x = (config.outputWidth - imgWidth) / 2;
    imgSprite.rect.y = (config.outputHeight - imgHeight) / 2;
    imgSprite.rect.w = imgWidth;
    imgSprite.rect.h = imgHeight;
    imgSprite.rect.angle = 0;
    imgSprite.time = { offset: 0, duration: videoClip.meta.duration };

    const videoSprite = new OffscreenSprite(videoClip as any);
    videoSprite.rect.x = config.videoX;
    videoSprite.rect.y = config.videoY;
    videoSprite.rect.w = config.videoWidth;
    videoSprite.rect.h = config.videoHeight;
    videoSprite.rect.angle = 0;
    videoSprite.time = { offset: 0, duration: videoClip.meta.duration };

    // 创建边框sprite
    let borderSprite: OffscreenSprite | null = null;
    if (config.videoBorderWidth > 0) {
        const borderCanvas = new OffscreenCanvas(
            config.outputWidth,
            config.outputHeight,
        );
        const borderCtx = borderCanvas.getContext("2d");
        if (borderCtx) {
            borderCtx.beginPath();
            borderCtx.roundRect(
                config.videoX,
                config.videoY,
                config.videoWidth,
                config.videoHeight,
                config.videoBorderRadius,
            );
            borderCtx.strokeStyle = toRgba(
                config.videoBorderColor,
                config.videoBorderOpacity / 100,
            );
            borderCtx.lineWidth = config.videoBorderWidth;
            borderCtx.stroke();
        }
        const borderBlob = await borderCanvas.convertToBlob();
        const borderStream = new Response(borderBlob).body as ReadableStream;
        const borderImgClip = new ImgClip(borderStream);
        await borderImgClip.ready;
        borderSprite = new OffscreenSprite(borderImgClip);
        borderSprite.rect.x = 0;
        borderSprite.rect.y = 0;
        borderSprite.rect.w = config.outputWidth;
        borderSprite.rect.h = config.outputHeight;
        borderSprite.rect.angle = 0;
        borderSprite.time = { offset: 0, duration: videoClip.meta.duration };
    }

    const com = webavCombinator({
        width: config.outputWidth,
        height: config.outputHeight,
    });

    // 添加sprite
    await com.addSprite(imgSprite);
    await com.addSprite(videoSprite);
    if (borderSprite) {
        await com.addSprite(borderSprite);
    }

    await webavWriteStream(outputFile, com);
    return outputFile;
};
