import { OffscreenSprite } from "@webav/av-cliper";
import { UnitFrame2us } from "../config";
import { imageDecoder } from "../decoder";
import {
    BaseTrackItem,
    BaseTrackItemOption,
    BaseVisibleTrackItem,
    ImageTrackSource,
    TrackItemType,
    TrackResizeOption,
} from "../type";
import { VIDEO_PREVIEW_FIXED_FPS } from "../../config";
import { StringUtil } from "../../../../../lib/util";

export class ImageTrackItem implements BaseTrackItem, BaseVisibleTrackItem {
    id: string;
    type: TrackItemType = "image";
    name: string;
    start: number;
    end: any;
    frameCount: number;
    format: string;
    source: ImageTrackSource;
    option: BaseTrackItemOption;

    centerX: number;
    centerY: number;
    scaleX: number;
    scaleY: number;
    height: number;
    width: number;

    constructor(source: ImageTrackSource, option: BaseTrackItemOption = {}) {
        // base
        source.id = source.id || StringUtil.random(32);
        source.duration = source.duration || 5;
        this.id = source.id;
        this.name = source.name;
        this.frameCount = VIDEO_PREVIEW_FIXED_FPS * source.duration;
        this.start = source.start || 0;
        this.end = this.start + this.frameCount;
        this.format = source.format;
        this.source = source;
        this.option = option;
        // visible
        this.centerX = source.centerX;
        this.centerY = source.centerY;
        this.scaleX = source.scaleX;
        this.scaleY = source.scaleY;
        this.height = source.height;
        this.width = source.width;
        // others
    }

    destroy() {
        // nothing
    }

    play(currentFrame: number) {}

    pause() {}

    get drawHeight() {
        return (this.height * this.scaleY) / 100;
    }

    get drawWidth() {
        return (this.width * this.scaleX) / 100;
    }

    getDrawX(width: number) {
        return width / 2 - this.drawWidth / 2 + this.centerX;
    }

    getDrawY(height: number) {
        return height / 2 - this.drawHeight / 2 + this.centerY;
    }

    draw(
        ctx: CanvasRenderingContext2D,
        { width, height }: { width: number; height: number },
        frameIndex: number,
    ) {
        const frame = Math.max(frameIndex - this.start, 0); // 默认展示首帧
        return imageDecoder
            .getFrame(this.source.format, this.source.id, frame)
            .then((vf) => {
                if (vf) {
                    ctx.drawImage(
                        vf,
                        0,
                        0,
                        this.source.width,
                        this.source.height,
                        this.getDrawX(width),
                        this.getDrawY(height),
                        this.drawWidth,
                        this.drawHeight,
                    );
                }
            });
    }

    resize(
        { width, height }: { width: number; height: number },
        option: TrackResizeOption = {},
    ) {
        // 视频、图片元素，在添加到画布中时，需要缩放为合适的尺寸，目标是能在画布中完整显示内容
        let scale = 1;
        if (this.source.width > width) {
            scale = width / this.source.width;
        }
        if (this.source.height > height) {
            scale = Math.min(scale, height / this.source.height);
        }
        if (option.init) {
            if (this.option.initScale) {
                scale = scale * this.option.initScale;
            }
        }
        this.width = this.source.width * scale;
        this.height = this.source.height * scale;
        // console.log('resize image', width, height, this.width, this.height, this.scaleX, this.scaleY);
    }

    // 生成合成对象
    async combine(
        playerSize: { width: number; height: number },
        outputRatio: number,
    ) {
        const clip = await imageDecoder.decode({ id: this.source.id });
        if (!clip) {
            throw new Error("frames is not ready");
        }
        const spr = new OffscreenSprite(clip);
        spr.time = {
            offset: this.start * UnitFrame2us,
            duration: this.frameCount * UnitFrame2us,
        };
        spr.rect.x = this.getDrawX(playerSize.width) * outputRatio;
        spr.rect.y = this.getDrawY(playerSize.height) * outputRatio;
        spr.rect.w = this.drawWidth * outputRatio;
        spr.rect.h = this.drawHeight * outputRatio;
        return spr;
    }
}
