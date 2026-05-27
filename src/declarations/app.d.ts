declare type VideoGenModelConfigType = {
    videoTemplateId: number;
    videoTemplateName: string;
    videoTemplateUrl: string;
    soundType: "soundGenerate" | "soundCustom";
    soundGenerateId: number;
    soundGenerateText: string;
    soundCustomFile: string;
};

declare type SoundAsrParamType = {
    serverName: string;
    serverTitle: string;
    serverVersion: string;
    type: "SoundAsr";
    serverKey: string;
    param: {
        [key: string]: any;
    };
};

declare type SoundGenerateParamType = {
    serverName: string;
    serverTitle: string;
    serverVersion: string;
    type: "SoundTts" | "SoundClone";
    ttsServerKey?: string;
    ttsParam?: {
        [key: string]: any;
    };
    cloneServerKey?: string;
    cloneParam?: {
        [key: string]: any;
    };
    promptId?: number;
    promptTitle?: string;
    promptUrl?: string;
    promptText?: string;
};

declare type VideoGenParamType = {
    serverName: string;
    serverTitle: string;
    serverVersion: string;
    serverKey: string;
    param: {
        [key: string]: any;
    };
    videoTemplateId: number;
    videoTemplateName: string;
    videoTemplateUrl: string;
};

declare type TextToImageParamType = {
    serverName: string;
    serverTitle: string;
    serverVersion: string;
    type: "TextToImage";
    serverKey: string;
    param: {
        [key: string]: any;
    };
};

declare type ImageToImageParamType = {
    serverName: string;
    serverTitle: string;
    serverVersion: string;
    type: "ImageToImage";
    serverKey: string;
    param: {
        [key: string]: any;
    };
};
