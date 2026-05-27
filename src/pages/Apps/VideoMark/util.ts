import { MP4Clip, OffscreenSprite } from "@webav/av-cliper";
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

export type VideoMarkOption = {
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
    borderColor: string;
    borderWidth: number;
    borderOpacity: number;
    borderRadius: number;
    borderStyle: "solid" | "dashed";
};

const arrowSvg = `<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M648.53333333 512a68.26666667 68.26666667 0 0 1 68.26666667-68.26666667h104.6528a34.13333333 34.13333333 0 0 0 22.528-59.73333333l-309.38453333-273.06666667a34.13333333 34.13333333 0 0 0-45.19253334 0l-309.4528 273.06666667A34.13333333 34.13333333 0 0 0 202.5472 443.73333333H307.2a68.26666667 68.26666667 0 0 1 68.26666667 68.26666667v375.46666667a34.13333333 34.13333333 0 0 0 34.13333333 34.13333333h204.8a34.13333333 34.13333333 0 0 0 34.13333333-34.13333333V512z m68.26666667 0v375.46666667A102.4 102.4 0 0 1 614.4 989.86666667h-204.8A102.4 102.4 0 0 1 307.2 887.46666667V512H202.5472a102.4 102.4 0 0 1-67.72053333-179.2l309.4528-273.06666667a102.4 102.4 0 0 1 135.44106666 0l309.4528 273.06666667A102.4 102.4 0 0 1 821.4528 512H716.8z" fill="{borderColor}" fill-opacity="{opacity}" stroke="{borderColor}" stroke-width="{borderWidth}"></path></svg>`;

export async function videoMarkExecute(
    option: VideoMarkOption,
): Promise<string> {
    const outputFile = await $mapi.file.temp("mp4");
    // 如果没有需要加速的片段，直接复制原视频
    if (option.times.length === 0) {
        await $mapi.file.copy(option.video, outputFile);
        return outputFile;
    }
    const clip = new VideoMarkVideoClip(option);
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

class VideoMarkVideoClip {
    #cvsEl: any;
    #ctx: any;
    #mp4Clip: any;
    #option: VideoMarkOption;
    #duration: number;
    #timeUs: number;
    #arrowImg: any;
    #marks: {
        startUs: number;
        endUs: number;
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

    constructor(option: VideoMarkOption) {
        this.#option = option;
        this.#cvsEl = document.createElement("canvas");
        this.#cvsEl.width = option.width;
        this.#cvsEl.height = option.height;
        this.#ctx = this.#cvsEl.getContext("2d")!;
        this.#marks = [];
        this.#duration = 0;
        this.#timeUs = 0;
        this.#arrowImg = null;
        this.ready = new Promise(async (resolve, reject) => {
            try {
                const meta = await this.init();
                resolve(meta);
            } catch (e) {
                reject(e);
            }
        });
    }

    buildMarks() {
        for (const t of this.#option.times) {
            const startUs = Math.floor(t.startMs * 1000);
            let endUs = Math.floor(t.endMs * 1000);
            // 保证闪烁完整：闪烁周期 400000 微秒（200000 开 + 200000 关）
            const blinkCycle = 400000;
            const durationUs = endUs - startUs;
            const adjustedDuration = Math.max(
                blinkCycle,
                Math.round(durationUs / blinkCycle) * blinkCycle,
            );
            endUs = startUs + adjustedDuration;
            this.#marks.push({
                startUs,
                endUs,
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height,
            });
        }
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
        this.buildMarks();
        // 创建箭头图像
        const size = Math.min(this.#option.width, this.#option.height) / 10;
        const strokeWidth = this.#option.borderWidth; // * (1024 / size) / 2;
        const svgString = arrowSvg
            .replace(/{borderColor}/g, this.#option.borderColor)
            .replace("{opacity}", this.#option.borderOpacity.toString())
            .replace("{borderWidth}", strokeWidth.toString());
        this.#arrowImg = new Image();
        this.#arrowImg.src = "data:image/svg+xml;base64," + btoa(svgString);
        await new Promise((resolve) => (this.#arrowImg.onload = resolve));
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
        TaskService.cancelCheck("VideoMark", this.#option.bizId);
        TaskService.updatePercent(this.#option.bizId, time / this.#timeUs);
        const frame = await this.#mp4Clip.tick(time);
        if (time > this.#timeUs || !frame) {
            return { state: "done" };
        }
        const mark = this.#marks.find(
            (m) => time >= m.startUs && time <= m.endUs,
        );
        // console.log('tick', {time, mark, frame});
        if (frame.video) {
            this.#ctx.clearRect(0, 0, this.#cvsEl.width, this.#cvsEl.height);
            this.#ctx.drawImage(
                frame.video,
                0,
                0,
                this.#cvsEl.width,
                this.#cvsEl.height,
            );
            if (mark) {
                let shouldDraw = true;
                if (mark.endUs - mark.startUs >= 1000000) {
                    const elapsed = time - mark.startUs;
                    const blinkInterval = 200000;
                    shouldDraw = Math.floor(elapsed / blinkInterval) % 2 === 0;
                }
                if (shouldDraw) {
                    this.#ctx.save();
                    this.#ctx.strokeStyle = toRgba(
                        this.#option.borderColor,
                        this.#option.borderOpacity,
                    );
                    this.#ctx.lineWidth = this.#option.borderWidth;
                    this.#ctx.lineJoin = "round";
                    if (this.#option.borderStyle === "dashed") {
                        this.#ctx.setLineDash([
                            this.#option.borderWidth * 2,
                            this.#option.borderWidth,
                        ]);
                    } else {
                        this.#ctx.setLineDash([]);
                    }
                    this.#ctx.beginPath();
                    const radius = this.#option.borderRadius;
                    this.#ctx.roundRect(
                        mark.x,
                        mark.y,
                        mark.width,
                        mark.height,
                        radius,
                    );
                    this.#ctx.stroke();
                    this.#ctx.restore();

                    // 绘制箭头
                    const size =
                        Math.min(this.#option.width, this.#option.height) / 8;
                    const halfSize = size / 2;
                    const centerX = mark.x + mark.width / 2;
                    const centerY = mark.y + mark.height / 2;

                    // 四个角位置：右下、右上、左下、左上
                    const positions = [
                        {
                            x: mark.x + mark.width + halfSize * 0.75,
                            y: mark.y + mark.height + halfSize * 0.75,
                        }, // 右下
                        {
                            x: mark.x + mark.width + halfSize * 0.75,
                            y: mark.y - halfSize * 0.75,
                        }, // 右上
                        {
                            x: mark.x - halfSize * 0.75,
                            y: mark.y + mark.height + halfSize * 0.75,
                        }, // 左下
                        {
                            x: mark.x - halfSize * 0.75,
                            y: mark.y - halfSize * 0.75,
                        }, // 左上
                    ];

                    let arrowX, arrowY, rotation;
                    let posIndex = -1;
                    for (let i = 0; i < positions.length; i++) {
                        const pos = positions[i];
                        if (
                            pos.x - halfSize >= 0 &&
                            pos.x + halfSize <= this.#option.width &&
                            pos.y - halfSize >= 0 &&
                            pos.y + halfSize <= this.#option.height
                        ) {
                            arrowX = pos.x;
                            arrowY = pos.y;
                            posIndex = i;
                            break;
                        }
                    }

                    if (posIndex !== -1) {
                        // 固定旋转角度指向45度角（对角线方向）
                        const rotations = [
                            (-3 * Math.PI) / 4,
                            (3 * Math.PI) / 4,
                            -Math.PI / 4,
                            Math.PI / 4,
                        ];
                        rotation = rotations[posIndex] + Math.PI * 2.5; // 保持原有调整
                    }

                    this.#ctx.save();
                    this.#ctx.translate(arrowX, arrowY);
                    this.#ctx.rotate(rotation);
                    this.#ctx.drawImage(
                        this.#arrowImg,
                        -halfSize,
                        -halfSize,
                        size,
                        size,
                    );
                    this.#ctx.restore();
                }
            }
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
        return new VideoMarkVideoClip(this.#option) as this;
    }

    destroy() {
        this.#cvsEl.remove();
    }
}
