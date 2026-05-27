import { ImgClip, OffscreenSprite } from "@webav/av-cliper";
import { StringUtil } from "../../../../../lib/util";
import { VIDEO_PREVIEW_FIXED_FPS } from "../../config";
import { getTextRect } from "../../util";
import { UnitFrame2us } from "../config";
import {
    BaseTrackItem,
    BaseTrackItemOption,
    BaseVisibleTrackItem,
    TextTrackSource,
    TrackItemType,
} from "../type";

export class TextTrackItem implements BaseTrackItem, BaseVisibleTrackItem {
    id: string;
    type: TrackItemType = "text";
    name: string;
    start: number;
    end: number;
    frameCount: number;
    format: string;
    source: TextTrackSource;
    option: BaseTrackItemOption;

    centerX = 0;
    centerY = 0;
    scaleX = 100;
    scaleY = 100;
    width = 0;
    height = 0;

    // 文本内容
    _content: string;
    _fontSize: number;
    _fontFamily: string;
    fill: string;
    stroke: string;
    textBackgroundColor: string;

    constructor(source: TextTrackSource, option: BaseTrackItemOption = {}) {
        // base
        source.id = source.id || StringUtil.random(32);
        source.duration = source.duration || 5;
        this.id = source.id;
        this.name = "text";
        this.frameCount = VIDEO_PREVIEW_FIXED_FPS * source.duration;
        this.start = source.start || 0;
        this.end = this.start + this.frameCount;
        this.format = "text";
        this.source = source;
        this.option = option;
        // visible
        this.centerX = 0;
        this.centerY = 0;
        this.scaleX = 100;
        this.scaleY = 100;
        this.width = 0;
        this.height = 0;
        // others
        this._content = source.content;
        this.fill = source.fill || "#000000";
        this.stroke = source.stroke || "";
        this.textBackgroundColor = source.textBackgroundColor || "";
        this._fontSize = source.fontSize || 24;
        this._fontFamily = source.fontFamily || "Arial";

        this.calcSize();
    }

    destroy() {
        // nothing
    }

    get fontSize() {
        return this._fontSize;
    }

    set fontSize(value: number) {
        this._fontSize = value;
        this.calcSize();
    }

    get fontFamily() {
        return this._fontFamily;
    }

    set fontFamily(value: string) {
        this._fontFamily = value;
        this.calcSize();
    }

    get content() {
        return this._content;
    }

    set content(value: string) {
        this._content = value;
        this.calcSize();
    }

    calcSize() {
        const { width, height } = getTextRect({
            text: this._content,
            fontSize: this._fontSize,
            fontFamily: this._fontFamily,
        });
        this.height = height;
        this.width = width;
    }

    get drawWidth() {
        return (this.width * this.scaleX) / 100;
    }

    get drawHeight() {
        return (this.height * this.scaleY) / 100;
    }

    getDrawX(width: number) {
        return width / 2 - this.drawWidth / 2 + this.centerX;
    }

    getDrawY(height: number) {
        return height / 2 - this.drawHeight / 2 + this.centerY;
    }

    drawRoundRect(
        ctx: OffscreenCanvasRenderingContext2D,
        {
            x,
            y,
            width,
            height,
            radius,
            color,
        }: {
            x: number;
            y: number;
            width: number;
            height: number;
            radius: number;
            color: string;
        },
    ) {
        console.log("TextTrackItem.drawRoundRect", {
            x,
            y,
            width,
            height,
            radius,
            color,
        });
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        ctx.fill();
    }

    // 渲染方法保持一致
    draw(
        ctx: OffscreenCanvasRenderingContext2D,
        {
            width,
            height,
        }: {
            width: number;
            height: number;
        },
        frameIndex: number,
    ) {
        console.log("TextTrackItem.draw", { width, height, frameIndex });
        const padding = 4;
        const radius = 4;
        const text = this.content;
        const drawL = this.getDrawX(width);
        const drawT = this.getDrawY(height);
        const size = (this.fontSize * Math.min(this.scaleX, this.scaleY)) / 100;
        const color = this.fill;
        const fontFamily = this.fontFamily;
        const strokeColor = this.stroke;
        const strokeWidth = 4;
        const backgroundColor = this.textBackgroundColor;

        const lines = text.split("\n");
        const lineHeight = size * 1.2; // Adjust line height as needed

        ctx.textBaseline = "top";
        ctx.font = `${size}px ${fontFamily}`;

        // Measure the widest line
        const textWidth = Math.max(
            ...lines.map((line) => ctx.measureText(line).width),
        );
        const totalHeight = lines.length * lineHeight;

        if (backgroundColor) {
            this.drawRoundRect(ctx, {
                x: drawL - padding,
                y: drawT - padding,
                width: textWidth + padding * 2,
                height: totalHeight + padding * 2,
                radius,
                color: backgroundColor,
            });
        }

        const startY = drawT + (totalHeight - lines.length * size) / 2; // Adjust y to center text vertically

        lines.forEach((line, index) => {
            const y = startY + index * lineHeight;

            if (strokeColor && strokeWidth) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.strokeText(line, drawL, y);
            }
            // @ts-ignore
            ctx.fillStyle = color;
            ctx.fillText(line, drawL, y);
        });

        return Promise.resolve();
    }

    async combine(
        playerSize: { width: number; height: number },
        outputRatio: number,
    ) {
        const canvas = new OffscreenCanvas(this.drawWidth, this.drawHeight);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("ctx is null");
        }
        this.draw(ctx, { width: this.drawWidth, height: this.drawHeight }, 0);
        const clip = new ImgClip(await createImageBitmap(canvas));

        await clip.ready;
        const spr = new OffscreenSprite(clip);
        // TODO：需要支持裁剪
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
