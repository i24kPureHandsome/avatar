import { defineAsyncComponent } from "vue";
import { t } from "../../lang";

import LongTextTts from "./LongTextTts/LongTextTts.vue";
import SubtitleTts from "./SubtitleTts/SubtitleTts.vue";
import SoundReplace from "./SoundReplace/SoundReplace.vue";
import SoundAsr from "../Video/SoundAsr.vue";

import VideoGenFlow from "./VideoGenFlow/VideoGenFlow.vue";

import LongTextTtsIcon from "~icons/mdi/waveform";
import SubtitleTtsIcon from "~icons/mdi/subtitles";
import SoundReplaceIcon from "~icons/mdi/microphone-variant";
import SoundAsrIcon from "~icons/mdi/microphone-outline";
import TextCutVideoIcon from "~icons/mdi/text-box-search";

import VideoGenFlowIcon from "~icons/mdi/video-vintage";

import TextToImage from "./TextToImage/TextToImage.vue";
import TextToImageIcon from "~icons/mdi/image-text";
import ImageToImage from "./ImageToImage/ImageToImage.vue";
import ImageToImageIcon from "~icons/mdi/image-filter-none";

import FeedbackIcon from "./../../assets/image/feedback.svg";

import AudioNormalIcon from "~icons/mdi/volume-high";
import VideoBackgroundIcon from "~icons/mdi/image-filter-hdr";
import VideoQuickCutIcon from "~icons/mdi/content-cut";
import VideoZoomIcon from "~icons/mdi/magnify";
import VideoMarkIcon from "~icons/mdi/watermark";
import VideoSubtitleIcon from "~icons/mdi/subtitles-outline";
import VideoSpeedIcon from "~icons/mdi/speedometer";
import VideoSizeConvertIcon from "~icons/mdi/aspect-ratio";
import VideoCompressIcon from "~icons/mdi/zip-box";
import VideoSpeedPartIcon from "~icons/mdi/fast-forward";
import VideoKeepPartIcon from "~icons/mdi/scissors-cutting";
import VideoMergeImageIcon from "~icons/mdi/image-plus";
import VideoMergeAudioIcon from "~icons/mdi/music-note-plus";
import VideoMergeIcon from "~icons/mdi/merge";
import MediaFormatConvertIcon from "~icons/mdi/transfer";
import FfmpegIcon from "~icons/mdi/console";

export const SoundApps: {
    name: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    component: any;
}[] = [];

export const SoundToolApps = [
    {
        name: "SoundAsr",
        title: t("voice.recognition"),
        description: t("desc.recognitionEdit"),
        icon: SoundAsrIcon,
        color: "#f59e0b",
        component: SoundAsr,
    },
    {
        name: "LongTextTts",
        title: t("task.longTextToAudio"),
        description: t("desc.longTextToAudio"),
        icon: LongTextTtsIcon,
        color: "#6366f1",
        component: LongTextTts,
    },
    {
        name: "SubtitleTts",
        title: t("task.subtitleToAudio"),
        description: t("desc.subtitleToAudio"),
        icon: SubtitleTtsIcon,
        color: "#8b5cf6",
        component: SubtitleTts,
    },
    {
        name: "SoundReplace",
        title: t("voice.replace"),
        description: t("desc.videoVoiceReplace"),
        icon: SoundReplaceIcon,
        color: "#ec4899",
        component: SoundReplace,
    },
    {
        name: "AudioNormal",
        title: "音频规范化",
        description: "对音频进行规范化处理，调整音量至标准水平。",
        icon: AudioNormalIcon,
        color: "#14b8a6",
        component: defineAsyncComponent(
            () => import("./AudioNormal/AudioNormal.vue"),
        ),
    },
];

export const VideoApps = [
    {
        name: "TextCutVideo",
        title: t("task.textCutVideo"),
        description: "通过语音识别提取视频文字内容，支持搜索定位、勾选剪辑",
        icon: TextCutVideoIcon,
        color: "#8b5cf6",
        component: defineAsyncComponent(
            () => import("./TextCutVideo/TextCutVideo.vue"),
        ),
    },
    {
        name: "VideoGenFlow",
        title: t("avatar.oneClickSynthesis"),
        description: t("intro.textToVideo"),
        icon: VideoGenFlowIcon,
        color: "#f59e0b",
        component: VideoGenFlow,
    },
];

export const ToolApps = [
    {
        name: "TextToImage",
        title: t("model.txt2img"),
        description: t("desc.txt2img"),
        icon: TextToImageIcon,
        color: "#3b82f6",
        component: TextToImage,
    },
    {
        name: "ImageToImage",
        title: t("model.img2img"),
        description: t("desc.img2img"),
        icon: ImageToImageIcon,
        color: "#06b6d4",
        component: ImageToImage,
    },
];

export const VideoProcessingApps = [
    {
        name: "VideoBackground",
        title: "视频背景添加",
        description: "为视频添加纯色或图片背景，提升视觉效果。",
        icon: VideoBackgroundIcon,
        color: "#22c55e",
        component: defineAsyncComponent(
            () => import("./VideoBackground/VideoBackground.vue"),
        ),
    },
    {
        name: "VideoQuickCut",
        title: "智能剪辑",
        description: "通过语音识别快速剪辑视频，支持片段自定义保留或移除。",
        icon: VideoQuickCutIcon,
        color: "#ef4444",
        component: defineAsyncComponent(
            () => import("./VideoQuickCut/VideoQuickCut.vue"),
        ),
    },
    {
        name: "VideoZoom",
        title: "视频片段放大",
        description: "放大视频片段，便于查看细节，支持快速操作。",
        icon: VideoZoomIcon,
        color: "#f97316",
        component: defineAsyncComponent(
            () => import("./VideoZoom/VideoZoom.vue"),
        ),
    },
    {
        name: "VideoMark",
        title: "视频标注",
        description: "在视频中标注指定区域，突出显示重要内容。",
        icon: VideoMarkIcon,
        color: "#a855f7",
        component: defineAsyncComponent(
            () => import("./VideoMark/VideoMark.vue"),
        ),
    },
    {
        name: "VideoSubtitle",
        title: "视频添加字幕",
        description: "为视频添加字幕，支持多种样式和位置调整。",
        icon: VideoSubtitleIcon,
        color: "#0ea5e9",
        component: defineAsyncComponent(
            () => import("./VideoSubtitle/VideoSubtitle.vue"),
        ),
    },
    {
        name: "VideoSpeed",
        title: "视频全局变速",
        description: "调整视频播放速度，实现快进或慢动作效果。",
        icon: VideoSpeedIcon,
        color: "#84cc16",
        component: defineAsyncComponent(
            () => import("./VideoSpeed/VideoSpeed.vue"),
        ),
    },
    {
        name: "VideoSizeConvert",
        title: "视频尺寸转换",
        description: "调整视频尺寸，支持横屏、竖屏预设和多种填充方式。",
        icon: VideoSizeConvertIcon,
        color: "#f43f5e",
        component: defineAsyncComponent(
            () => import("./VideoSizeConvert/VideoSizeConvert.vue"),
        ),
    },
    {
        name: "VideoCompress",
        title: "视频压缩",
        description: "对视频进行压缩处理，调整编码、分辨率和压缩程度。",
        icon: VideoCompressIcon,
        color: "#78716c",
        component: defineAsyncComponent(
            () => import("./VideoCompress/VideoCompress.vue"),
        ),
    },
    {
        name: "VideoSpeedPart",
        title: "视频片段变速",
        description: "标记视频片段并加速，支持局部速度调整。",
        icon: VideoSpeedPartIcon,
        color: "#d946ef",
        component: defineAsyncComponent(
            () => import("./VideoSpeedPart/VideoSpeedPart.vue"),
        ),
    },
    {
        name: "VideoKeepPart",
        title: "视频片段删除/保留",
        description: "选择视频片段，支持保留或移除指定内容。",
        icon: VideoKeepPartIcon,
        color: "#64748b",
        component: defineAsyncComponent(
            () => import("./VideoKeepPart/VideoKeepPart.vue"),
        ),
    },
    {
        name: "VideoMergeImage",
        title: "片头片尾图片",
        description: "将图片合并到视频开头或结尾，支持时长设置。",
        icon: VideoMergeImageIcon,
        color: "#10b981",
        component: defineAsyncComponent(
            () => import("./VideoMergeImage/VideoMergeImage.vue"),
        ),
    },
    {
        name: "VideoMergeAudio",
        title: "视频添加音频",
        description: "将音频文件合并到视频中，支持音量调节。",
        icon: VideoMergeAudioIcon,
        color: "#7c3aed",
        component: defineAsyncComponent(
            () => import("./VideoMergeAudio/VideoMergeAudio.vue"),
        ),
    },
    {
        name: "VideoMerge",
        title: "视频合并",
        description: "将多个视频文件合并为一个视频，支持拼接和叠加。",
        icon: VideoMergeIcon,
        color: "#dc2626",
        component: defineAsyncComponent(
            () => import("./VideoMerge/VideoMerge.vue"),
        ),
    },
    {
        name: "MediaFormatConvert",
        title: "媒体格式转换",
        description: "转换视频和音频格式，支持多种编码和比特率设置。",
        icon: MediaFormatConvertIcon,
        color: "#2563eb",
        component: defineAsyncComponent(
            () => import("./MediaFormatConvert/MediaFormatConvert.vue"),
        ),
    },
    {
        name: "Ffmpeg",
        title: "FFmpeg 处理",
        description: "执行自定义 FFmpeg 命令，支持多文件输入输出。",
        icon: FfmpegIcon,
        color: "#374151",
        component: defineAsyncComponent(() => import("./Ffmpeg/Ffmpeg.vue")),
    },
];

export const AllApps = [
    ...(SoundApps.map((app) => ({
        ...app,
        url: `/video?tab=${app.name}`,
    })) as any),
    ...(SoundToolApps.map((app) => ({
        ...app,
        url: `/tool?tab=${app.name}`,
    })) as any),
    ...(ToolApps.map((app) => ({
        ...app,
        url: `/tool?tab=${app.name}`,
    })) as any),
    ...(VideoProcessingApps.map((app) => ({
        ...app,
        url: `/tool?tab=${app.name}`,
    })) as any),
    {
        title: t("feedback.toolRequest"),
        description: t("msg.moreTools"),
        icon: FeedbackIcon,
        url: "https://aigcpanel.com/wish",
    },
];
