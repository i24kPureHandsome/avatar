<script setup lang="ts">
import { onMounted, ref } from "vue";
import { t } from "../../lang";

const platform = window.$mapi.app.platformName() as "win" | "osx" | "linux";

const cliBinPath = ref("");
const symlinkTarget = "/usr/local/bin/aigcpanel";
const localBinTarget = "~/.local/bin/aigcpanel";

const installStatus = ref<"idle" | "loading" | "done" | "error">("idle");
const installMsg = ref("");
const isInstalled = ref(false);
const docVisible = ref(false);

const cliTaskDocs: Array<{ biz: string; title: string; example: string }> = [
    {
        biz: "SoundGenerate",
        title: "声音克隆",
        example: 'aigcpanel task --biz SoundGenerate --text "你好世界"',
    },
    {
        biz: "SoundAsr",
        title: "语音识别",
        example: "aigcpanel task --biz SoundAsr --file /path/to/audio.wav",
    },
    {
        biz: "VideoGen",
        title: "数字人合成",
        example: 'aigcpanel task --biz VideoGen --text "欢迎使用"',
    },
    {
        biz: "VideoGenFlow",
        title: "视频生成流",
        example: 'aigcpanel task --biz VideoGenFlow --text "欢迎使用"',
    },
    {
        biz: "LongTextTts",
        title: "长文本转音频",
        example:
            'aigcpanel task --biz LongTextTts --text "这是一段较长的文本内容"',
    },
    {
        biz: "SubtitleTts",
        title: "字幕转音频",
        example:
            "aigcpanel task --biz SubtitleTts --file /path/to/subtitle.srt",
    },
    {
        biz: "SoundReplace",
        title: "声音替换",
        example: "aigcpanel task --biz SoundReplace --file /path/to/video.mp4",
    },
    {
        biz: "TextToImage",
        title: "文生图",
        example: 'aigcpanel task --biz TextToImage --prompt "美丽的山水风景"',
    },
    {
        biz: "ImageToImage",
        title: "图生图",
        example:
            'aigcpanel task --biz ImageToImage --file /path/to/image.png --prompt "油画风格"',
    },
    {
        biz: "AudioNormal",
        title: "声音归一化",
        example: "aigcpanel task --biz AudioNormal --file /path/to/audio.wav",
    },
    {
        biz: "Ffmpeg",
        title: "Ffmpeg处理",
        example: "aigcpanel task --biz Ffmpeg --file /path/to/input.mp4",
    },
    {
        biz: "MediaFormatConvert",
        title: "媒体格式转换",
        example:
            "aigcpanel task --biz MediaFormatConvert --file /path/to/video.mp4 --targetFormat mp4",
    },
    {
        biz: "VideoBackground",
        title: "视频背景",
        example:
            "aigcpanel task --biz VideoBackground --file /path/to/video.mp4 --image /path/to/bg.png",
    },
    {
        biz: "VideoCompress",
        title: "视频压缩",
        example: "aigcpanel task --biz VideoCompress --file /path/to/video.mp4",
    },
    {
        biz: "VideoKeepPart",
        title: "视频片段删除/保留",
        example: "aigcpanel task --biz VideoKeepPart --file /path/to/video.mp4",
    },
    {
        biz: "VideoMark",
        title: "视频标注",
        example: "aigcpanel task --biz VideoMark --file /path/to/video.mp4",
    },
    {
        biz: "VideoMerge",
        title: "视频合并",
        example:
            "aigcpanel task --biz VideoMerge --file /path/to/video1.mp4 --file2 /path/to/video2.mp4",
    },
    {
        biz: "VideoMergeAudio",
        title: "视频添加音频",
        example:
            "aigcpanel task --biz VideoMergeAudio --file /path/to/video.mp4 --audio /path/to/audio.wav",
    },
    {
        biz: "VideoMergeImage",
        title: "片头片尾图片",
        example:
            "aigcpanel task --biz VideoMergeImage --file /path/to/video.mp4 --image /path/to/image.png",
    },
    {
        biz: "VideoQuickCut",
        title: "快速剪辑",
        example: "aigcpanel task --biz VideoQuickCut --file /path/to/video.mp4",
    },
    {
        biz: "VideoSizeConvert",
        title: "视频尺寸转换",
        example:
            "aigcpanel task --biz VideoSizeConvert --file /path/to/video.mp4 --targetWidth 1280 --targetHeight 720",
    },
    {
        biz: "VideoSpeed",
        title: "视频变速",
        example:
            "aigcpanel task --biz VideoSpeed --file /path/to/video.mp4 --speed 1.5",
    },
    {
        biz: "VideoSpeedPart",
        title: "视频片段变速",
        example:
            "aigcpanel task --biz VideoSpeedPart --file /path/to/video.mp4",
    },
    {
        biz: "VideoSubtitle",
        title: "视频添加字幕",
        example:
            "aigcpanel task --biz VideoSubtitle --file /path/to/video.mp4 --subtitle /path/to/subtitle.srt",
    },
    {
        biz: "VideoZoom",
        title: "视频片段放大",
        example: "aigcpanel task --biz VideoZoom --file /path/to/video.mp4",
    },
];

onMounted(async () => {
    if (platform !== "win") {
        cliBinPath.value =
            await window.$mapi.app.resourcePathResolve("bin/aigcpanel");
        await checkInstalled();
    } else {
        cliBinPath.value =
            await window.$mapi.app.resourcePathResolve("bin/aigcpanel.exe");
    }
});

async function checkInstalled() {
    try {
        const { stdout } = await window.$mapi.app.shell(
            "which aigcpanel 2>/dev/null || echo ''",
        );
        isInstalled.value = stdout.trim().length > 0;
    } catch {
        isInstalled.value = false;
    }
}

const doInstall = async () => {
    installStatus.value = "loading";
    installMsg.value = "";
    try {
        if (platform === "osx") {
            await window.$mapi.app.shell(
                `osascript -e 'do shell script "ln -sf \\"${cliBinPath.value}\\" ${symlinkTarget}" with administrator privileges'`,
            );
            installMsg.value = t("cli.installedTo", { path: symlinkTarget });
        } else if (platform === "linux") {
            await window.$mapi.app.shell(
                `mkdir -p "$HOME/.local/bin" && ln -sf "${cliBinPath.value}" "$HOME/.local/bin/aigcpanel"`,
            );
            installMsg.value = t("cli.installedTo", {
                path: "~/.local/bin/aigcpanel",
            });
        }
        installStatus.value = "done";
        isInstalled.value = true;
    } catch (e: any) {
        installStatus.value = "error";
        installMsg.value = e.stderr || e.message || t("cli.installFailed");
    }
};
</script>

<template>
    <div>
        <!-- macOS / Linux -->
        <template v-if="platform !== 'win'">
            <div class="flex mb-3">
                <div class="w-24 flex-shrink-0">{{ $t("cli.toolPath") }}</div>
                <div
                    class="flex-grow text-gray-500 break-all text-sm leading-6"
                >
                    {{ cliBinPath || $t("common.loadingDots") }}
                </div>
            </div>
            <div class="flex mb-3">
                <div class="w-24 flex-shrink-0">
                    {{ $t("cli.usageInstructions") }}
                </div>
                <div class="flex-grow">
                    <div class="text-sm text-gray-500 mb-2">
                        {{ $t("cli.usageDesc") }}
                        <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded"
                            >aigcpanel</code
                        >
                    </div>
                    <div
                        class="bg-gray-100 dark:bg-gray-800 rounded p-3 text-sm font-mono space-y-1"
                    >
                        <div class="text-gray-400"># 查看版本</div>
                        <div>aigcpanel version</div>
                        <div class="mt-2 text-gray-400">
                            # 查看已安装模型列表
                        </div>
                        <div>aigcpanel model_list</div>
                        <div class="mt-2 text-gray-400">
                            # 提交任务（以视频压缩为例）
                        </div>
                        <div>
                            aigcpanel task --biz VideoCompress --file
                            /path/to/video.mp4
                        </div>
                        <div class="mt-2 text-gray-400">
                            # 提交任务（以语音合成为例）
                        </div>
                        <div>
                            aigcpanel task --biz SoundGenerate --text "你好"
                        </div>
                    </div>
                    <div class="mt-3 text-sm text-gray-500">
                        {{ $t("cli.installLocation") }}：
                        <template v-if="platform === 'osx'">
                            <code
                                class="bg-gray-100 dark:bg-gray-700 px-1 rounded"
                                >{{ symlinkTarget }}</code
                            >{{ $t("cli.requiresAdminPassword") }}
                        </template>
                        <template v-else>
                            <code
                                class="bg-gray-100 dark:bg-gray-700 px-1 rounded"
                                >{{ localBinTarget }}</code
                            >
                            <span class="ml-2">{{
                                $t("cli.pathHintLinux")
                            }}</span>
                        </template>
                    </div>
                    <div class="mt-3">
                        <a-button @click="docVisible = true">
                            <template #icon><icon-file /></template>
                            查看完整文档
                        </a-button>
                    </div>
                </div>
            </div>
            <div class="flex mb-3 items-center">
                <div class="w-24 flex-shrink-0">
                    {{ $t("cli.installSection") }}
                </div>
                <div class="flex items-center gap-3">
                    <a-button
                        type="primary"
                        :loading="installStatus === 'loading'"
                        :disabled="!cliBinPath"
                        @click="doInstall"
                    >
                        <template #icon><icon-link /></template>
                        {{
                            isInstalled
                                ? $t("cli.reinstall")
                                : $t("cli.install")
                        }}
                    </a-button>
                    <span
                        v-if="installStatus === 'done'"
                        class="text-green-600 text-sm"
                    >
                        <icon-check-circle /> {{ installMsg }}
                    </span>
                    <span
                        v-else-if="installStatus === 'error'"
                        class="text-red-500 text-sm"
                    >
                        <icon-close-circle /> {{ installMsg }}
                    </span>
                    <span v-else-if="isInstalled" class="text-gray-400 text-sm">
                        <icon-check-circle /> {{ $t("cli.installed") }}
                    </span>
                </div>
            </div>
        </template>

        <!-- Windows -->
        <template v-else>
            <div class="flex mb-3">
                <div class="w-24 flex-shrink-0">{{ $t("cli.toolPath") }}</div>
                <div
                    class="flex-grow text-gray-500 break-all text-sm leading-6"
                >
                    {{ cliBinPath || $t("common.loadingDots") }}
                </div>
            </div>
            <div class="flex mb-3">
                <div class="w-24 flex-shrink-0">
                    {{ $t("cli.usageInstructions") }}
                </div>
                <div class="flex-grow">
                    <div class="text-sm text-gray-500 mb-2">
                        {{ $t("cli.addPathDesc") }}
                    </div>
                    <div
                        class="bg-gray-100 dark:bg-gray-800 rounded p-3 text-sm font-mono space-y-1"
                    >
                        <div class="text-gray-400">:: 查看版本</div>
                        <div>aigcpanel version</div>
                        <div class="mt-2 text-gray-400">
                            :: 查看已安装模型列表
                        </div>
                        <div>aigcpanel model_list</div>
                        <div class="mt-2 text-gray-400">
                            :: 提交任务（以视频压缩为例）
                        </div>
                        <div>
                            aigcpanel task --biz VideoCompress --file
                            C:\path\to\video.mp4
                        </div>
                        <div class="mt-2 text-gray-400">
                            :: 提交任务（以语音合成为例）
                        </div>
                        <div>
                            aigcpanel task --biz SoundGenerate --text "你好"
                        </div>
                    </div>
                    <div class="mt-3 text-sm text-gray-500">
                        {{ $t("cli.configPath") }}
                    </div>
                    <div class="mt-3">
                        <a-button @click="docVisible = true">
                            <template #icon><icon-file /></template>
                            查看完整文档
                        </a-button>
                    </div>
                </div>
            </div>
        </template>

        <!-- 完整文档弹窗 -->
        <a-modal
            v-model:visible="docVisible"
            :width="'min(800px, 90vw)'"
            :footer="false"
            title-align="start"
        >
            <template #title
                ><div class="font-bold">CLI 工具完整文档</div></template
            >
            <div
                class="p-4 space-y-6 text-sm overflow-y-auto"
                style="max-height: calc(100vh - 15rem)"
            >
                <div>
                    <div class="font-bold text-base mb-2">命令列表</div>
                    <table class="w-full border-collapse">
                        <thead>
                            <tr class="bg-gray-100 dark:bg-gray-800">
                                <th
                                    class="text-left p-2 border border-gray-200 dark:border-gray-700"
                                >
                                    命令
                                </th>
                                <th
                                    class="text-left p-2 border border-gray-200 dark:border-gray-700"
                                >
                                    说明
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td
                                    class="p-2 border border-gray-200 dark:border-gray-700 font-mono"
                                >
                                    version
                                </td>
                                <td
                                    class="p-2 border border-gray-200 dark:border-gray-700"
                                >
                                    查看 CLI 版本号
                                </td>
                            </tr>
                            <tr>
                                <td
                                    class="p-2 border border-gray-200 dark:border-gray-700 font-mono"
                                >
                                    model_list
                                </td>
                                <td
                                    class="p-2 border border-gray-200 dark:border-gray-700"
                                >
                                    列出已安装的 AI 模型
                                </td>
                            </tr>
                            <tr>
                                <td
                                    class="p-2 border border-gray-200 dark:border-gray-700 font-mono"
                                >
                                    task
                                </td>
                                <td
                                    class="p-2 border border-gray-200 dark:border-gray-700"
                                >
                                    提交任务并等待结果
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <div class="font-bold text-base mb-2">task 命令参数</div>
                    <div
                        class="bg-gray-100 dark:bg-gray-800 rounded p-3 font-mono mb-2"
                    >
                        aigcpanel task --biz &lt;任务类型&gt; [--key value ...]
                    </div>
                    <table class="w-full border-collapse">
                        <thead>
                            <tr class="bg-gray-100 dark:bg-gray-800">
                                <th
                                    class="text-left p-2 border border-gray-200 dark:border-gray-700"
                                >
                                    参数
                                </th>
                                <th
                                    class="text-left p-2 border border-gray-200 dark:border-gray-700"
                                >
                                    说明
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td
                                    class="p-2 border border-gray-200 dark:border-gray-700 font-mono"
                                >
                                    --biz
                                </td>
                                <td
                                    class="p-2 border border-gray-200 dark:border-gray-700"
                                >
                                    必填，任务类型名称
                                </td>
                            </tr>
                            <tr>
                                <td
                                    class="p-2 border border-gray-200 dark:border-gray-700 font-mono"
                                >
                                    --key value
                                </td>
                                <td
                                    class="p-2 border border-gray-200 dark:border-gray-700"
                                >
                                    任务参数，作为 modelConfig 传入
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <div class="font-bold text-base mb-2">使用示例</div>
                    <div class="space-y-3">
                        <div>
                            <div class="text-gray-500 mb-1">查看版本</div>
                            <div
                                class="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono"
                            >
                                aigcpanel version
                            </div>
                        </div>
                        <div>
                            <div class="text-gray-500 mb-1">查看模型列表</div>
                            <div
                                class="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono"
                            >
                                aigcpanel model_list
                            </div>
                        </div>
                        <div v-for="doc in cliTaskDocs" :key="doc.biz">
                            <div class="text-gray-500 mb-1">
                                {{ doc.title }}（{{ doc.biz }}）
                            </div>
                            <div
                                class="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono break-all"
                            >
                                {{ doc.example }}
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="font-bold text-base mb-2">认证配置</div>
                    <div class="text-gray-500">
                        CLI 工具通过读取本地配置文件与 AigcPanel
                        服务通信，配置文件在启动 AigcPanel 后自动生成：
                    </div>
                    <div
                        class="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono mt-2"
                    >
                        <template v-if="platform === 'osx'"
                            >~/Library/Application
                            Support/aigcpanel/cli-auth.json</template
                        >
                        <template v-else-if="platform === 'linux'"
                            >~/.config/aigcpanel/cli-auth.json</template
                        >
                        <template v-else
                            >%APPDATA%\aigcpanel\cli-auth.json</template
                        >
                    </div>
                </div>
            </div>
        </a-modal>
    </div>
</template>
