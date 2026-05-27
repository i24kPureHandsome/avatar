import packageJson from "../package.json";

const BASE_URL = "https://aigcpanel.com";

export const BrandDefaults = {
    name: "AI-AVATAR",
    title: "AI-AVATAR",
    slogan: "一站式AI数字人系统",
};

export const AppConfig = {
    name: BrandDefaults.name,
    title: BrandDefaults.title,
    slogan: BrandDefaults.slogan,
    version: packageJson.version,
    website: `${BASE_URL}`,
    websiteGithub: "https://github.com/modstart-lib/aigcpanel",
    websiteGitee: "https://gitee.com/modstart-lib/aigcpanel",
    apiBaseUrl: `${BASE_URL}/api`,
    updaterUrl: `${BASE_URL}/app_manager/updater/open`,
    downloadUrl: `${BASE_URL}/app_manager/download`,
    feedbackUrl: `${BASE_URL}/feedback_ticket`,
    statisticsUrl: `${BASE_URL}/app_manager/collect`,
    guideUrl: `${BASE_URL}/app_manager/guide`,
    helpUrl: `${BASE_URL}/app_manager/help`,
    serverUrl: `${BASE_URL}/aigcpanel/`,
    basic: {
        userEnable: false,
    },
};

export function initAppBrand(config: Record<string, any>) {
    if ("appName" in config && config.appName) {
        AppConfig.name = config.appName;
    }
    if ("appTitle" in config && config.appTitle) {
        AppConfig.title = config.appTitle;
    }
    if ("appSlogan" in config && config.appSlogan) {
        AppConfig.slogan = config.appSlogan;
    }
}
