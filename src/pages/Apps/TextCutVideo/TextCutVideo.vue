<script setup lang="ts">
import { nextTick, ref, computed, watch } from "vue";
import { t } from "../../../lang";
import { Dialog } from "../../../lib/dialog";
import { TimeUtil } from "../../../lib/util";
import { ffmpegVideoToAudio } from "../../../lib/ffmpeg";
import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import { serverSoundAsr } from "../../../lib/server";
import { useServerStore } from "../../../store/modules/server";
import FileSelector from "../../../components/common/FileSelector.vue";
import SoundAsrForm from "../../Video/components/SoundAsrForm.vue";
import { TextCutVideoSegment } from "./type";
import { textCutVideoMerge, textCutVideoSeparate } from "./util";

const serverStore = useServerStore();

type Phase = "idle" | "extracting" | "recognizing" | "editing" | "exporting" | "done";

const phase = ref<Phase>("idle");
const videoPath = ref("");
const soundAsrForm = ref<InstanceType<typeof SoundAsrForm>>();
const videoRef = ref<HTMLVideoElement | null>(null);
const soundAsrConfigured = ref(false);

const videoInfo = ref<{ duration: number; width: number; height: number; fps: number } | null>(null);
const audioFile = ref("");
const segments = ref<(TextCutVideoSegment & { startSeconds: number; endSeconds: number })[]>([]);
const currentIndex = ref(-1);
const searchKeyword = ref("");
const exportMode = ref<"merge" | "separate">("merge");
const exportFiles = ref<string[]>([]);
const progressMsg = ref("");

const filteredSegments = computed(() => {
    if (!searchKeyword.value.trim()) {
        return segments.value.map((seg, index) => ({ seg, index, matched: false }));
    }
    const keyword = searchKeyword.value.trim().toLowerCase();
    return segments.value.map((seg, index) => ({
        seg,
        index,
        matched: seg.text.toLowerCase().includes(keyword),
    }));
});

const includeCount = computed(() => segments.value.filter((s) => s.include).length);
const totalCount = computed(() => segments.value.length);

const isProcessing = computed(() => phase.value === "extracting" || phase.value === "recognizing" || phase.value === "exporting");

watch(videoPath, async (newVal) => {
    if (newVal && soundAsrConfigured.value) {
        await doStart();
    }
});

const onSoundAsrConfigured = async () => {
    soundAsrConfigured.value = true;
    if (videoPath.value) {
        await doStart();
    }
};

const doStart = async () => {
    const soundAsr = await soundAsrForm.value?.getValue();
    if (!soundAsr) {
        return;
    }
    if (!videoPath.value) {
        return;
    }
    const server = await serverStore.getByKey(soundAsr.serverKey);
    if (!server) {
        Dialog.tipError(t("hint.selectRecognitionModel"));
        return;
    }

    exportFiles.value = [];
    segments.value = [];
    currentIndex.value = -1;

    try {
        phase.value = "extracting";
        progressMsg.value = "正在提取音频...";

        const info = await ffprobeVideoInfo(videoPath.value);
        videoInfo.value = info;

        const audio = await ffmpegVideoToAudio(videoPath.value);
        audioFile.value = audio;

        phase.value = "recognizing";
        progressMsg.value = "正在进行语音识别...";

        const ret = await serverSoundAsr(
            "TextCutVideo",
            "single-page",
            soundAsr,
            {},
            audio,
            { cache: true },
        );

        if (ret.type === "retry") {
            Dialog.tipError("语音识别需要重试");
            phase.value = "idle";
            return;
        }

        segments.value = (ret.records || []).map((r: any) => ({
            start: r.start,
            end: r.end,
            text: r.text,
            include: r.text ? true : false,
            startSeconds: r.start / 1000,
            endSeconds: r.end / 1000,
        }));

        phase.value = "editing";
        progressMsg.value = "";
    } catch (e: any) {
        Dialog.tipError(String(e));
        phase.value = "idle";
        progressMsg.value = "";
    }
};

const doExport = async () => {
    const includeSegs = segments.value.filter((s) => s.include);
    if (includeSegs.length === 0) {
        Dialog.tipError(t("error.noSegmentSelected"));
        return;
    }
    try {
        phase.value = "exporting";
        progressMsg.value = "正在导出视频...";

        let files: string[];
        if (exportMode.value === "merge") {
            const file = await textCutVideoMerge(videoPath.value, segments.value);
            files = [file];
        } else {
            files = await textCutVideoSeparate(videoPath.value, segments.value);
        }

        const savedFiles: string[] = [];
        for (const f of files) {
            savedFiles.push(await $mapi.file.hubSave(f));
        }
        exportFiles.value = savedFiles;
        phase.value = "done";
        progressMsg.value = "";
        Dialog.tipSuccess("导出完成");
    } catch (e: any) {
        Dialog.tipError(String(e));
        phase.value = "editing";
        progressMsg.value = "";
    }
};

const doReset = () => {
    phase.value = "idle";
    videoPath.value = "";
    videoInfo.value = null;
    audioFile.value = "";
    segments.value = [];
    currentIndex.value = -1;
    searchKeyword.value = "";
    exportMode.value = "merge";
    exportFiles.value = [];
    progressMsg.value = "";
};

const onTimeUpdate = () => {
    const currentTime = videoRef.value?.currentTime || 0;
    const newIndex = segments.value.findIndex(
        (seg) => seg.startSeconds <= currentTime && currentTime < seg.endSeconds,
    );
    if (newIndex !== currentIndex.value) {
        currentIndex.value = newIndex;
        if (newIndex !== -1) {
            nextTick(() => {
                const el = document.querySelector(
                    `[data-segment-index='${newIndex}']`,
                ) as HTMLElement;
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            });
        }
    }
};

const onTimestampClick = (seg: TextCutVideoSegment & { startSeconds: number; endSeconds: number }) => {
    if (videoRef.value) {
        videoRef.value.currentTime = seg.startSeconds;
        videoRef.value.play();
    }
};

const mouseDownPos = ref<{ x: number; y: number } | null>(null);
const mouseDownTarget = ref<"row" | "timestamp" | null>(null);

const onRowMouseDown = (e: MouseEvent) => {
    mouseDownPos.value = { x: e.clientX, y: e.clientY };
    mouseDownTarget.value = "row";
};

const onRowMouseUp = (e: MouseEvent, seg: TextCutVideoSegment) => {
    if (!mouseDownPos.value) return;
    const dx = Math.abs(e.clientX - mouseDownPos.value.x);
    const dy = Math.abs(e.clientY - mouseDownPos.value.y);
    mouseDownPos.value = null;
    const target = mouseDownTarget.value;
    mouseDownTarget.value = null;
    if (dx < 5 && dy < 5 && target === "row") {
        seg.include = !seg.include;
    }
};

const onTimestampMouseDown = (e: MouseEvent) => {
    mouseDownPos.value = { x: e.clientX, y: e.clientY };
    mouseDownTarget.value = "timestamp";
};

const onTimestampMouseUp = (e: MouseEvent, seg: TextCutVideoSegment & { startSeconds: number; endSeconds: number }) => {
    if (!mouseDownPos.value) return;
    const dx = Math.abs(e.clientX - mouseDownPos.value.x);
    const dy = Math.abs(e.clientY - mouseDownPos.value.y);
    mouseDownPos.value = null;
    const target = mouseDownTarget.value;
    mouseDownTarget.value = null;
    if (dx < 5 && dy < 5 && target === "timestamp") {
        onTimestampClick(seg);
    }
};

const onTextClick = (seg: TextCutVideoSegment) => {
    seg.include = !seg.include;
};

const onToggleAll = (val: boolean) => {
    segments.value.forEach((s) => (s.include = val));
};

const onInvertSelection = () => {
    segments.value.forEach((s) => (s.include = !s.include));
};

const highlightText = (text: string, keyword: string): string => {
    if (!keyword.trim() || !text) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(
        new RegExp(`(${escaped})`, "gi"),
        '<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">$1</mark>',
    );
};

const onOpenFile = async (file: string) => {
    await $mapi.file.openFile(file);
};

const onSaveFile = async (file: string) => {
    const fileExt = file.split(".").pop() || "mp4";
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    let filePath = await window.$mapi.file.openSave({
        defaultPath: `${ts}.${fileExt}`,
    });
    if (!filePath) return;
    if (!filePath.endsWith(`.${fileExt}`)) {
        filePath = filePath + `.${fileExt}`;
    }
    await window.$mapi.file.copy(file, filePath, { isDataPath: false });
    Dialog.tipSuccess(t("common.downloadSuccess"));
};
</script>

<template>
    <div class="h-full flex">
        <div class="w-1/2 flex flex-col border-r">
            <div class="bg-gray-50 p-2 border-b flex items-center">
                <div class="text-sm font-medium text-gray-700 flex-grow">
                    {{ $t("common.preview") }}
                </div>
                <div v-if="videoInfo" class="text-xs text-gray-400">
                    {{ TimeUtil.secondsToTime(videoInfo.duration) }}
                </div>
                <a-button
                    v-if="videoPath"
                    size="mini"
                    class="ml-2"
                    @click="doReset"
                >
                    <icon-refresh />
                    重新选择
                </a-button>
            </div>
            <div class="flex-grow relative bg-black">
                <video
                    v-if="videoPath"
                    ref="videoRef"
                    :src="`file://${videoPath}`"
                    controls
                    class="w-full h-full"
                    @timeupdate="onTimeUpdate"
                ></video>
                <div
                    v-else
                    class="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-400 cursor-pointer"
                    @click="($refs.videoFileSelector as any)?.$el?.querySelector('input')?.click()"
                >
                    <icon-video-camera class="text-5xl mb-3 text-gray-500" />
                    <div class="text-lg mb-1">点击选择视频文件</div>
                    <div class="text-sm text-gray-500">支持 MP4 格式</div>
                    <div class="mt-4">
                        <FileSelector
                            ref="videoFileSelector"
                            :extensions="['mp4']"
                            v-model="videoPath"
                            class="hidden"
                        />
                    </div>
                </div>
                <div
                    v-if="isProcessing"
                    class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center"
                >
                    <a-spin size="40" />
                    <div class="mt-4 text-white text-sm">{{ progressMsg }}</div>
                </div>
            </div>
        </div>

        <div class="w-1/2 flex flex-col">
            <div class="bg-gray-50 p-2 border-b flex items-center gap-2">
                <div class="text-sm font-medium text-gray-700 flex-grow">
                    {{ $t("common.segment") }}
                </div>
                <div v-if="segments.length > 0" class="text-xs text-gray-500">
                    {{
                        $t("common.segmentCount", {
                            include: includeCount,
                            total: totalCount,
                        })
                    }}
                </div>
            </div>

            <div v-if="!soundAsrConfigured" class="p-3 border-b">
                <SoundAsrForm ref="soundAsrForm" />
                <div class="mt-2 flex">
                    <a-button
                        type="primary"
                        size="small"
                        @click="onSoundAsrConfigured"
                    >
                        确认配置
                    </a-button>
                </div>
            </div>

            <div v-if="segments.length > 0" class="p-2 border-b flex items-center gap-2">
                <a-input
                    v-model="searchKeyword"
                    :placeholder="$t('common.searchText')"
                    allow-clear
                    size="small"
                    class="flex-grow"
                >
                    <template #prefix>
                        <icon-search />
                    </template>
                </a-input>
                <a-button size="mini" @click="onToggleAll(true)">
                    {{ $t("common.selectAll") }}
                </a-button>
                <a-button size="mini" @click="onInvertSelection">
                    {{ $t("common.invertSelection") }}
                </a-button>
                <a-button size="mini" @click="onToggleAll(false)">
                    {{ $t("common.deSelectAll") }}
                </a-button>
            </div>

            <div class="flex-grow overflow-y-auto">
                <div
                    v-if="segments.length === 0 && !isProcessing && soundAsrConfigured"
                    class="flex flex-col items-center justify-center h-full text-gray-400"
                >
                    <icon-file class="text-4xl mb-2 text-gray-300" />
                    <div v-if="!videoPath" class="text-sm">请在左侧选择视频文件</div>
                    <div v-else class="text-sm">等待识别结果...</div>
                </div>
                <div
                    v-for="item in filteredSegments"
                    :key="item.index"
                    :data-segment-index="item.index"
                    :class="[
                        'border-b p-2 hover:bg-gray-50 select-text',
                        item.index === currentIndex ? 'bg-blue-50' : '',
                        item.matched === false && searchKeyword.trim()
                            ? 'opacity-40'
                            : '',
                    ]"
                    @mousedown="onRowMouseDown($event)"
                    @mouseup="onRowMouseUp($event, item.seg)"
                >
                    <div class="flex items-center">
                        <a-checkbox
                            :model-value="item.seg.include"
                            @click.stop
                            @change="onTextClick(item.seg)"
                            class="mr-2 flex-shrink-0"
                        />
                        <div
                            class="text-xs text-gray-500 font-mono cursor-pointer hover:text-blue-600 hover:underline flex-shrink-0"
                            @mousedown.stop="onTimestampMouseDown($event)"
                            @mouseup.stop="onTimestampMouseUp($event, item.seg)"
                        >
                            {{ TimeUtil.secondsToTime(item.seg.startSeconds, true) }}
                            -
                            {{ TimeUtil.secondsToTime(item.seg.endSeconds, true) }}
                        </div>
                        <div class="flex-grow"></div>
                        <a-tag
                            :color="item.seg.include ? 'green' : 'red'"
                            size="small"
                        >
                            {{
                                item.seg.include
                                    ? $t("common.include")
                                    : $t("common.exclude")
                            }}
                        </a-tag>
                    </div>
                    <div
                        class="text-sm mt-1"
                        :class="item.seg.include ? 'text-gray-800' : 'text-gray-400 line-through'"
                        v-html="highlightText(item.seg.text || $t('common.emptySegment'), searchKeyword)"
                    ></div>
                </div>
            </div>

            <div v-if="segments.length > 0" class="p-2 border-t flex items-center gap-3">
                <div class="text-sm text-gray-600">
                    {{ $t("common.exportMode") }}:
                </div>
                <a-radio-group v-model="exportMode" size="small">
                    <a-radio value="merge">
                        {{ $t("common.mergeToOneVideo") }}
                    </a-radio>
                    <a-radio value="separate">
                        {{ $t("common.exportSeparately") }}
                    </a-radio>
                </a-radio-group>
                <div class="flex-grow"></div>
                <a-button
                    v-if="phase === 'editing' || phase === 'done'"
                    type="primary"
                    size="small"
                    @click="doExport"
                >
                    <icon-export class="mr-1" />
                    导出视频
                </a-button>
                <a-spin v-else-if="phase === 'exporting'" size="small" />
            </div>

            <div
                v-if="phase === 'done' && exportFiles.length > 0"
                class="p-2 border-t bg-green-50"
            >
                <div class="text-sm font-medium text-green-700 mb-1">
                    导出完成
                </div>
                <div class="space-y-1">
                    <div
                        v-for="(file, idx) in exportFiles"
                        :key="idx"
                        class="flex items-center gap-2"
                    >
                        <icon-file class="text-green-600" />
                        <span class="text-sm text-gray-700 flex-grow truncate">
                            {{ file.split(/[\\/]/).pop() }}
                        </span>
                        <a-button
                            size="mini"
                            type="text"
                            @click="onOpenFile(file)"
                        >
                            <icon-eye />
                        </a-button>
                        <a-button
                            size="mini"
                            type="text"
                            @click="onSaveFile(file)"
                        >
                            <icon-download />
                        </a-button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
