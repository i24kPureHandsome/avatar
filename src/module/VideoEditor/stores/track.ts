import { IClip } from "@webav/av-cliper";
import { defineStore } from "pinia";
import { computed, reactive, ref, watchEffect } from "vue";
import { FileUtil } from "../../../lib/file";
import { StorageUtil } from "../../../lib/storage";
import { StringUtil } from "../../../lib/util";
import rectSelectorIcon from "../assets/image/rectSelector.svg";
import timeRangeSelectorIcon from "../assets/image/timeRangeSelector.svg";
import {
    audioDecoder,
    imageDecoder,
    videoDecoder,
} from "../core/track/decoder";
import { AudioTrackItem } from "../core/track/item/AudioTrackItem";
import { ImageTrackItem } from "../core/track/item/ImageTrackItem";
import { TextTrackItem } from "../core/track/item/TextTrackItem";
import { VideoTrackItem } from "../core/track/item/VideoTrackItem";
import { checkTrackListOverlap } from "../core/track/track";
import {
    AllTrackSource,
    BaseTrackItemOption,
    ImageTrackSource,
    TextTrackSource,
    TrackAddType,
    TrackItem,
    TrackLineItem,
} from "../core/track/type";
import { RequireSome, VideoEditorTrack } from "../core/type";
import { usePlayerStore } from "./player";
import { usePageStore } from "./page";

const pageStore = usePageStore();

export const useTrackStore = defineStore("videoEditorTrackStore", () => {
    const playerStore = usePlayerStore();
    const dragData = reactive({
        // 拖拽数据
        dataInfo: {} as TrackItem,
        dragType: "",
        dragPoint: {
            x: 0,
            y: 0,
        },
        // 吸附辅助线
        fixLines: [] as { position: number; frame: number }[][],
        moveX: 0,
        moveY: 0,
    });
    const moveTrackData = reactive({
        // 行内移动
        lineIndex: -1,
        itemIndex: -1,
    });

    // 轨道放大比例 parseInt(localStorage.trackS || '60')
    const trackScale = ref<number>(
        StorageUtil.get("VideoEditor.TrackScale", 60),
    );
    const trackList = reactive<TrackLineItem[]>([]);

    watchEffect(() => {
        StorageUtil.set("VideoEditor.TrackScale", trackScale.value);
    });

    // 选中元素坐标
    const selectTrackItem = reactive({
        line: -1,
        index: -1,
    });
    // 选中元素
    const selectResource = computed(() => {
        if (selectTrackItem.line === -1) {
            return null;
        }
        return (
            trackList[selectTrackItem.line]?.list[selectTrackItem.index] || null
        );
    });

    function removeTrack(lineIndex: number, itemIndex: number) {
        const item = trackList[lineIndex]?.list[itemIndex];
        trackList[lineIndex].list.splice(itemIndex, 1);
        if (
            trackList[lineIndex].list.length === 0 &&
            !trackList[lineIndex].main
        ) {
            trackList.splice(lineIndex, 1);
        }
        if (trackList.length === 1 && trackList[0].list.length === 0) {
            trackList.splice(0, 1);
        }
    }

    // 复用已有行
    // function insertExistingLine(item: TrackItem, insertLine: { line: number, index: number }) {
    //   trackList[insertLine.line].list.splice(insertLine.index, 0, item);
    //   selectTrackItem.line = insertLine.line;
    //   selectTrackItem.index = insertLine.index;
    // }
    // 插入新行
    // function insertNewLine(item: TrackItem) {
    //   const isVA = ['video', 'audio'].includes(item.type);
    //   trackList[isVA ? 'push' : 'unshift']({
    //     type: item.type,
    //     list: [item]
    //   });
    //   selectTrackItem.line = isVA ? trackList.length - 1 : 0;
    //   selectTrackItem.index = 0;
    // }
    // 移动目标行
    // function moveTargetLine(item: TrackItem, insertLine: { line: number, index: number }) {
    //   let { lineIndex: moveLineIndex = -1, itemIndex: moveIndex = -1 } = moveTrackData;
    //   // 将原本的数据设置为undefined，避免在插入时被删除
    //   trackList[moveLineIndex].list.splice(moveIndex, 1, undefined);
    //   // 在插入行设置数据
    //   trackList[insertLine.line].list.splice(insertLine.index, 0, item);
    //   // 遍历删除undefined
    //   trackList[moveLineIndex].list = trackList[moveLineIndex].list.filter(elem => elem);

    //   if (trackList[moveLineIndex].list.length === 0 && !trackList[moveLineIndex].main) {
    //     trackList.splice(moveLineIndex, 1);
    //   }
    // }
    // 目标行不可用，则移动到目标之后、之前
    // function moveLine(item: TrackItem, targetLineIndex: number) {
    //   let { lineIndex: moveLineIndex = -1, itemIndex: moveIndex = -1 } = moveTrackData;
    //   trackList.splice(targetLineIndex, 0, {
    //     type: item.type,
    //     list: [item]
    //   });
    //   if (moveLineIndex !== -1 && moveIndex !== -1) { // 移动到新行，删除老数据
    //     if (targetLineIndex <= moveLineIndex) {
    //       moveLineIndex++; // 如果在移除元素前面插入，则移除下标自增
    //     }
    //     if (trackList[moveLineIndex].list.length === 1 && targetLineIndex > moveLineIndex) {
    //       targetLineIndex--; // 如果在移除元素前面插入，选中元素列上移
    //     }
    //     removeTrack(moveLineIndex, moveIndex, false);
    //   }
    //   selectTrackItem.line = targetLineIndex;
    //   selectTrackItem.index = 0;
    // }
    function selectTrackById(id: string) {
        trackList.forEach((item, index) => {
            item.list.forEach((trackItem, trackIndex) => {
                if (trackItem.option.locked) {
                    return;
                }
                if (trackItem.id === id) {
                    selectTrackItem.line = index;
                    selectTrackItem.index = trackIndex;
                }
            });
        });
    }

    /**
     * 添加片段逻辑：
     * 输入：新增片段
     * 查询是否存在同类型轨道，且无重叠部分，存在则插入，不存在则新建轨道
     * 没有轨道时，新增轨道插入
     */
    function addTrack(newItem: TrackItem) {
        const lines = trackList.filter((line) => line.type === newItem.type);
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            const { hasOverlap, insertIndex } = checkTrackListOverlap(
                line.list as any,
                newItem,
            );
            if (!hasOverlap) {
                line.list.splice(insertIndex, 0, newItem);
                if (!newItem.option.locked) {
                    selectTrackItem.line = index;
                    selectTrackItem.index = insertIndex;
                }
                return;
            }
        }
        if (["audio"].includes(newItem.type)) {
            trackList.push({
                type: newItem.type,
                list: [newItem],
            });
            if (!newItem.option.locked) {
                selectTrackItem.line = 0;
                selectTrackItem.index = 0;
            }
        } else {
            trackList.unshift({
                type: newItem.type,
                list: [newItem],
            });
            if (!newItem.option.locked) {
                selectTrackItem.line = 0;
                selectTrackItem.index = 0;
            }
        }
    }

    const frameCount = computed(() => {
        return trackList.reduce((res, { list }) => {
            return Math.max(
                list.reduce((max, track) => Math.max(max, track.end), 0),
                res,
            );
        }, 0);
    });

    async function addImageTrack(
        source: RequireSome<ImageTrackSource, "url" | "name" | "format">,
        stream: ReadableStream | string,
        option: BaseTrackItemOption = {},
    ) {
        source.id = source.id || StringUtil.random(32);
        if (typeof stream === "string") {
            const ext = FileUtil.getExt(stream);
            source.format = FileUtil.extensionToType(ext);
            source.url = `file://${stream}`;
            source.name = FileUtil.getBaseName(stream, true);
            stream = (await $mapi.file.readStream(stream, {
                isDataPath: false,
            })) as ReadableStream;
        }
        const clip = await imageDecoder.decode({
            id: source.id,
            stream,
            format: source.format,
        });
        if (!clip) {
            throw new Error("解析图片失败");
        }
        // console.log('addImageTrack', JSON.stringify(source, null, 2));
        if (typeof source.start === "undefined") {
            source.start = playerStore.frameIndex;
        }
        let width = clip.meta.width;
        let height = clip.meta.height;
        let scaleX = source.scaleX || 100;
        let scaleY = source.scaleY || 100;
        if (
            !source.scaleX &&
            !source.scaleY &&
            ["RectSelector.svg", "TimeRangeSelector.svg"].includes(source.name)
        ) {
            // 内置正方形素材，初始化时需要自动按比例显示
            if (playerStore.canvasWidth > playerStore.canvasHeight) {
                scaleX =
                    (playerStore.canvasWidth / playerStore.canvasHeight) *
                    scaleX;
            } else {
                scaleY =
                    (playerStore.canvasHeight / playerStore.canvasWidth) *
                    scaleX;
            }
        }
        // console.log('addImageTrack', {
        //     width,
        //     height,
        //     scaleX,
        //     scaleY,
        //     playerWidth: playerStore.playerWidth,
        //     playerHeight: playerStore.playerHeight
        // });
        const imageTrack = new ImageTrackItem(
            {
                id: source.id,
                url: source.url,
                name: source.name,
                format: source.format,
                start: source.start,
                centerX: source.centerX || 0,
                centerY: source.centerY || 0,
                scaleX,
                scaleY,
                width,
                height,
                duration:
                    source.duration || Math.round(clip.meta.duration / 1e6),
            },
            option,
        );
        imageTrack.resize(
            {
                width: playerStore.canvasWidth,
                height: playerStore.canvasHeight,
            },
            { init: true },
        );
        addTrack(imageTrack);
    }

    async function addVideoTrack(
        source: RequireSome<ImageTrackSource, "url" | "name" | "format">,
        stream: ReadableStream | string,
        option: BaseTrackItemOption = {},
    ) {
        source.id = source.id || StringUtil.random(32);
        if (typeof stream === "string") {
            const ext = FileUtil.getExt(stream);
            source.format = FileUtil.extensionToType(ext);
            source.url = `file://${stream}`;
            source.name = FileUtil.getBaseName(stream, true);
            stream = (await $mapi.file.readStream(stream, {
                isDataPath: false,
            })) as ReadableStream;
        }
        const clip = await videoDecoder.decode({
            id: source.id,
            stream,
            format: source.format,
        });
        if (!clip) {
            throw new Error("解析视频失败");
        }
        if (typeof source.start === "undefined") {
            source.start = playerStore.frameIndex;
        }
        const videoTrack = new VideoTrackItem(
            {
                id: source.id,
                url: source.url,
                name: source.name,
                format: source.format,
                start: source.start,
                centerX: source.centerX || 0,
                centerY: source.centerY || 0,
                scaleX: source.scaleX || 100,
                scaleY: source.scaleY || 100,
                width: clip.meta.width,
                height: clip.meta.height,
                duration: Math.round(clip.meta.duration / 1e6),
            },
            option,
        );
        videoTrack.resize(
            {
                width: playerStore.canvasWidth,
                height: playerStore.canvasHeight,
            },
            { init: true },
        );
        addTrack(videoTrack);
    }

    async function addAudioTrack(
        source: RequireSome<ImageTrackSource, "url" | "name" | "format">,
        stream: ReadableStream | string,
        option: BaseTrackItemOption = {},
    ) {
        source.id = source.id || StringUtil.random(32);
        if (typeof stream === "string") {
            const ext = FileUtil.getExt(stream);
            source.format = FileUtil.extensionToType(ext);
            source.url = `file://${stream}`;
            source.name = FileUtil.getBaseName(stream, true);
            stream = (await $mapi.file.readStream(stream, {
                isDataPath: false,
            })) as ReadableStream;
        }
        const clip = await audioDecoder.decode({
            id: source.id,
            stream,
            format: source.format,
        });
        if (!clip) {
            throw new Error("解析音频失败");
        }
        if (typeof source.start === "undefined") {
            source.start = playerStore.frameIndex;
        }
        const audioTrack = new AudioTrackItem(
            {
                id: source.id,
                url: source.url,
                name: source.name,
                format: source.format,
                start: source.start,
                duration: Math.round(clip.meta.duration / 1e6),
            },
            option,
        );
        addTrack(audioTrack);
    }

    async function addTextTrack(
        source: RequireSome<TextTrackSource, "content">,
        option: BaseTrackItemOption = {},
    ) {
        source.id = source.id || StringUtil.random(32);
        if (typeof source.start === "undefined") {
            source.start = playerStore.frameIndex;
        }
        const textTrack = new TextTrackItem(
            {
                id: source.id,
                start: source.start,
                duration: source.duration || 5,
                content: source.content,
                fontSize: source.fontSize || 24,
                fontFamily: source.fontFamily || "Arial",
                fill: source.fill || "#000000",
                stroke: source.stroke || "",
                textBackgroundColor: source.textBackgroundColor || "",
            },
            option,
        );
        addTrack(textTrack);
    }

    async function addTrackFromData(
        source: Partial<AllTrackSource>,
        ext: string,
        name: string,
        url: string,
        format: string,
        stream: ReadableStream,
        option: BaseTrackItemOption = {},
    ) {
        if (["mp4", "mov"].includes(ext)) {
            await addVideoTrack(
                { ...source, name, url, format },
                stream,
                option,
            );
        } else if (["mp3", "wav"].includes(ext)) {
            await addAudioTrack(
                { ...source, name, url, format },
                stream,
                option,
            );
        } else if (["png", "jpg", "gif", "svg"].includes(ext)) {
            await addImageTrack(
                { ...source, name, url, format },
                stream,
                option,
            );
        } else {
            throw new Error("不支持的文件格式");
        }
    }

    async function addTrackFromFile(
        source: Partial<AllTrackSource>,
        file: File,
        option: BaseTrackItemOption = {},
    ) {
        const stream = file.stream();
        const format = file.type;
        const ext = FileUtil.getExt(file.name);
        const url = URL.createObjectURL(file);
        const name = file.name;
        await addTrackFromData(source, ext, name, url, format, stream, option);
    }

    async function addTrackFromPath(
        source: Partial<AllTrackSource>,
        path: string,
        option: BaseTrackItemOption = {},
    ) {
        const stream = await $mapi.file.readStream(path, {
            isDataPath: false,
        });
        const ext = FileUtil.getExt(path);
        const format = FileUtil.extensionToType(ext);
        const url = `file://${path}`;
        const name = FileUtil.getBaseName(path, true);
        await addTrackFromData(source, ext, name, url, format, stream!, option);
    }

    async function addTrackFromBuildIn(
        source: Partial<AllTrackSource>,
        type: TrackAddType,
        option: BaseTrackItemOption = {},
    ) {
        // console.log('addTrackFromBuildIn', JSON.stringify({type, source, option}, null, 2));
        if (type === "RectSelector") {
            const blob = await FileUtil.urlToBlob(rectSelectorIcon);
            const url = await FileUtil.blobToBase64Url(blob);
            const stream = blob.stream();
            const format = "image/svg+xml";
            const ext = "svg";
            const name = "RectSelector.svg";
            if (typeof source.duration === "undefined") {
                source.duration = pageStore.option.defaultRectSelectorDuration;
            }
            await addTrackFromData(
                source,
                ext,
                name,
                url,
                format,
                stream,
                option,
            );
            return;
        } else if (type === "TimeRangeSelector") {
            const blob = await FileUtil.urlToBlob(timeRangeSelectorIcon);
            const url = await FileUtil.blobToBase64Url(blob);
            const stream = blob.stream();
            const format = "image/svg+xml";
            const ext = "svg";
            const name = "TimeRangeSelector.svg";
            await addTrackFromData(
                source,
                ext,
                name,
                url,
                format,
                stream,
                option,
            );
            return;
        }
        throw new Error("不支持的添加类型");
    }

    async function setData(tracks: VideoEditorTrack[]) {
        const trackLineItems: TrackLineItem[] = [];
        for (const track of tracks) {
            const list: TrackItem[] = [];
            for (const item of track.list) {
                let trackItem: TrackItem | null = null;
                let clip: IClip | null = null;
                const stream = await FileUtil.urlToBlob(item.source.url).then(
                    (v) => v.stream(),
                );
                if (track.type === "video") {
                    clip = await videoDecoder.decode({
                        id: item.source.id,
                        stream,
                        format: item.source.format,
                    });
                    trackItem = new VideoTrackItem(item.source, item.option);
                } else if (track.type === "audio") {
                    clip = await audioDecoder.decode({
                        id: item.source.id,
                        stream,
                        format: item.source.format,
                    });
                    trackItem = new AudioTrackItem(item.source, item.option);
                } else if (track.type === "image") {
                    clip = await imageDecoder.decode({
                        id: item.source.id,
                        stream,
                        format: item.source.format,
                    });
                    trackItem = new ImageTrackItem(item.source, item.option);
                } else if (track.type === "text") {
                    trackItem = new TextTrackItem(item.source, item.option);
                }
                if (trackItem) {
                    const assignKeys = [
                        // base
                        "start",
                        // BaseVisibleTrackItem
                        "centerX",
                        "centerY",
                        "scaleX",
                        "scaleY",
                        "width",
                        "height",
                        // BaseMediaTrackItem
                        "offsetL",
                        "offsetR",
                        // others for text
                        "fill",
                        "stroke",
                        "textBackgroundColor",
                        "fontSize",
                        "fontFamily",
                        "content",
                        // others for video
                        ///// nothing
                        // others for image
                        ///// nothing
                        // others for audio
                        ///// nothing
                    ];
                    assignKeys.forEach((key) => {
                        if (
                            item.hasOwnProperty(key) &&
                            trackItem &&
                            (trackItem as any)[key] !== undefined
                        ) {
                            (trackItem as any)[key] =
                                item[key as keyof typeof item];
                        }
                    });
                    list.push(trackItem);
                }
            }
            trackLineItems.push({
                type: track.type,
                main: ["video", "audio"].includes(track.type),
                list: list,
            });
        }
        // clear
        trackList.splice(0, trackList.length);
        // add
        trackLineItems.forEach((line) => {
            trackList.push(line);
        });
        // reset select
        selectTrackItem.line = -1;
        selectTrackItem.index = -1;
        // console.log('track.setData.result', toRaw(trackList));
    }

    const reset = () => {
        trackList.forEach((line) => {
            line.list.forEach((item) => {
                item.destroy && item.destroy();
            });
        });
        trackList.splice(0, trackList.length);
        selectTrackItem.line = -1;
        selectTrackItem.index = -1;
        videoDecoder.reset();
        audioDecoder.reset();
        imageDecoder.reset();
    };

    return {
        reset,
        moveTrackData,
        selectTrackItem,
        selectResource,
        trackScale,
        trackList,
        addTrack,
        addImageTrack,
        addVideoTrack,
        addAudioTrack,
        addTextTrack,
        addTrackFromFile,
        addTrackFromPath,
        addTrackFromBuildIn,
        selectTrackById,
        removeTrack,
        frameCount,
        dragData,
        setData,
    };
});
