import { createI18n } from "vue-i18n";

import enUS from "./en-US.json";
import zhCN from "./zh-CN.json";

// Module locales

import componentsEnUS from "../components/locales/en-US.json";
import componentsZhCN from "../components/locales/zh-CN.json";
import appsEnUS from "../pages/Apps/locales/en-US.json";
import appsZhCN from "../pages/Apps/locales/zh-CN.json";
import {
    default as soundEnUS,
    default as videoEnUS,
} from "../pages/Video/locales/en-US.json";
import {
    default as soundZhCN,
    default as videoZhCN,
} from "../pages/Video/locales/zh-CN.json";

// Apps sub-module locales
import imageToImageEnUS from "../pages/Apps/ImageToImage/lang/en-US.json";
import imageToImageZhCN from "../pages/Apps/ImageToImage/lang/zh-CN.json";
import longTextTtsEnUS from "../pages/Apps/LongTextTts/lang/en-US.json";
import longTextTtsZhCN from "../pages/Apps/LongTextTts/lang/zh-CN.json";
import soundReplaceEnUS from "../pages/Apps/SoundReplace/lang/en-US.json";
import soundReplaceZhCN from "../pages/Apps/SoundReplace/lang/zh-CN.json";
import subtitleTtsEnUS from "../pages/Apps/SubtitleTts/lang/en-US.json";
import subtitleTtsZhCN from "../pages/Apps/SubtitleTts/lang/zh-CN.json";
import textToImageEnUS from "../pages/Apps/TextToImage/lang/en-US.json";
import textToImageZhCN from "../pages/Apps/TextToImage/lang/zh-CN.json";
import videoGenFlowEnUS from "../pages/Apps/VideoGenFlow/lang/en-US.json";
import videoGenFlowZhCN from "../pages/Apps/VideoGenFlow/lang/zh-CN.json";
import videoMergeAudioEnUS from "../pages/Apps/VideoMergeAudio/lang/en-US.json";
import videoMergeAudioZhCN from "../pages/Apps/VideoMergeAudio/lang/zh-CN.json";
import videoMergeImageEnUS from "../pages/Apps/VideoMergeImage/lang/en-US.json";
import videoMergeImageZhCN from "../pages/Apps/VideoMergeImage/lang/zh-CN.json";
import videoQuickCutEnUS from "../pages/Apps/VideoQuickCut/lang/en-US.json";
import videoQuickCutZhCN from "../pages/Apps/VideoQuickCut/lang/zh-CN.json";
import videoSizeConvertEnUS from "../pages/Apps/VideoSizeConvert/lang/en-US.json";
import videoSizeConvertZhCN from "../pages/Apps/VideoSizeConvert/lang/zh-CN.json";
import videoSpeedEnUS from "../pages/Apps/VideoSpeed/lang/en-US.json";
import videoSpeedZhCN from "../pages/Apps/VideoSpeed/lang/zh-CN.json";
import videoSpeedPartEnUS from "../pages/Apps/VideoSpeedPart/lang/en-US.json";
import videoSpeedPartZhCN from "../pages/Apps/VideoSpeedPart/lang/zh-CN.json";
import videoSubtitleEnUS from "../pages/Apps/VideoSubtitle/lang/en-US.json";
import videoSubtitleZhCN from "../pages/Apps/VideoSubtitle/lang/zh-CN.json";
import videoZoomEnUS from "../pages/Apps/VideoZoom/lang/en-US.json";
import videoZoomZhCN from "../pages/Apps/VideoZoom/lang/zh-CN.json";
import textCutVideoEnUS from "../pages/Apps/TextCutVideo/lang/en-US.json";
import textCutVideoZhCN from "../pages/Apps/TextCutVideo/lang/zh-CN.json";

let localeInit = false;
export const defaultLocale = "zh-CN";

export const messageList = [
    {
        name: "en-US",
        label: "English",
        messages: {
            ...enUS,

            ...soundEnUS,
            ...appsEnUS,
            ...videoEnUS,
            ...componentsEnUS,
            // Apps sub-modules
            ...imageToImageEnUS,
            ...longTextTtsEnUS,
            ...soundReplaceEnUS,
            ...subtitleTtsEnUS,
            ...textToImageEnUS,
            ...videoGenFlowEnUS,
            ...videoMergeAudioEnUS,
            ...videoMergeImageEnUS,
            ...videoQuickCutEnUS,
            ...videoSizeConvertEnUS,
            ...videoSpeedEnUS,
            ...videoSpeedPartEnUS,
            ...videoSubtitleEnUS,
            ...videoZoomEnUS,
            ...textCutVideoEnUS,
        },
    },
    {
        name: "zh-CN",
        label: "简体中文",
        messages: {
            ...zhCN,

            ...soundZhCN,
            ...appsZhCN,
            ...videoZhCN,
            ...componentsZhCN,
            // Apps sub-modules
            ...imageToImageZhCN,
            ...longTextTtsZhCN,
            ...soundReplaceZhCN,
            ...subtitleTtsZhCN,
            ...textToImageZhCN,
            ...videoGenFlowZhCN,
            ...videoMergeAudioZhCN,
            ...videoMergeImageZhCN,
            ...videoQuickCutZhCN,
            ...videoSizeConvertZhCN,
            ...videoSpeedZhCN,
            ...videoSpeedPartZhCN,
            ...videoSubtitleZhCN,
            ...videoZoomZhCN,
            ...textCutVideoZhCN,
        },
    },
];

const buildMessages = (): any => {
    let messages = {};
    for (let m of messageList) {
        messages[m.name] = m.messages;
    }
    return messages;
};

const messages = buildMessages();

export const i18n = createI18n({
    locale: defaultLocale,
    legacy: false,
    globalInjection: true,
    messages,
});

if (window.$mapi) {
    window.$mapi.config.get("lang", defaultLocale).then((lang: string) => {
        i18n.global.locale.value = lang as any;
        localeInit = true;
        fireLocaleChange(lang);
    });
}

export type LocaleItem = {
    name: string;
    label: string;
    active?: boolean;
};

export const listLocales = () => {
    let list: LocaleItem[] = messageList;
    list.forEach((item) => {
        item.active = i18n.global.locale.value === item.name;
    });
    return list;
};

export const getLocale = async () => {
    return new Promise<string>((resolve) => {
        if (localeInit) {
            resolve(i18n.global.locale.value);
        } else {
            setTimeout(() => {
                resolve(getLocale());
            }, 100);
        }
    });
};

let localeChangeListener: Array<(locale: string) => void> = [];

export const onLocaleChange = (callback: (lang: string) => void) => {
    localeChangeListener.push(callback);
};

const fireLocaleChange = (lang: string) => {
    localeChangeListener.forEach((callback) => {
        callback(lang);
    });
};

export const changeLocale = (lang: string) => {
    i18n.global.locale.value = lang as any;
    window.$mapi.config.set("lang", lang).then(() => {
        fireLocaleChange(lang);
    });
};

export const t = (key: string, param: object | null = null) => {
    // check if exists key
    if (!(key in messages[i18n.global.locale.value])) {
        if (param) {
            return key.replace(/\{(\w+)\}/g, function (match, key) {
                return key in param ? param[key] : match;
            });
        }
        return key;
    }
    // @ts-ignore
    return i18n.global.t(key, param as any);
};
