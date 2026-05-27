import { OffscreenSprite } from "@webav/av-cliper";
import { UnitFrame2us } from "../config";
import { audioDecoder, splitClip } from "../decoder";
import {
    AudioTrackSource,
    BaseMediaTrackItem,
    BaseTrackItem,
    BaseTrackItemOption,
    BaseTrackSource,
    TrackItemType,
} from "../type";
import { VIDEO_PREVIEW_FIXED_FPS } from "../../config";
import { StringUtil } from "../../../../../lib/util";

export class AudioTrackItem implements BaseTrackItem, BaseMediaTrackItem {
    id: string;
    type: TrackItemType = "audio";
    name: string;
    start: number;
    end: number;
    frameCount: number;
    format: string;
    source: AudioTrackSource;
    option: BaseTrackItemOption;

    offsetL: number;
    offsetR: number;

    constructor(source: AudioTrackSource, option: BaseTrackItemOption = {}) {
        // base
        source.id = source.id || StringUtil.random(32);
        source.duration = source.duration || 5;
        this.id = source.id;
        this.name = source.name;
        this.format = source.format;
        this.frameCount = source.duration * VIDEO_PREVIEW_FIXED_FPS;
        this.start = source.start || 0;
        this.end = this.start + this.frameCount;
        this.source = source;
        this.option = option;
        // media
        this.offsetL = 0;
        this.offsetR = 0;
        // others
    }

    destroy() {
        if (this.audio) {
            this.audio.pause();
            this.audio.src = "";
            this.audio = null;
        }
    }

    audio: HTMLAudioElement | null = null;

    play(currentFrame: number) {
        if (!this.audio) {
            this.audio = new Audio(this.source.url);
        }
        if (this.audio?.paused) {
            this.audio.currentTime =
                (currentFrame - this.start - this.offsetL) /
                VIDEO_PREVIEW_FIXED_FPS;
            this.audio.play();
        }
    }

    pause() {
        if (this.audio && !this.audio.paused) {
            this.audio.pause();
        }
    }

    // 生成合成对象
    async combine() {
        const audio = await audioDecoder.decode({ id: this.source.id! });
        const clip = await splitClip(audio!, {
            offsetL: this.offsetL,
            offsetR: this.offsetR,
            frameCount: this.frameCount,
        });
        if (!clip) {
            throw new Error("clip is not ready");
        }
        const spr = new OffscreenSprite(clip);
        // TODO：需要支持裁剪
        spr.time = {
            offset: this.start * UnitFrame2us,
            duration: (this.end - this.start) * UnitFrame2us,
        };
        return spr;
    }
}
