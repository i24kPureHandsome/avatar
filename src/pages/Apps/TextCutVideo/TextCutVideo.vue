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
import { useModelStore } from "../../../module/Model/store/model";
import ModelSelector from "../../../module/Model/ModelSelector.vue";

const serverStore = useServerStore();
const modelStore = useModelStore();

type Phase =
    | "idle"
    | "extracting"
    | "recognizing"
    | "editing"
    | "exporting"
    | "done";

const phase = ref<Phase>("idle");
const videoPath = ref("");
const soundAsrForm = ref<InstanceType<typeof SoundAsrForm>>();
const videoRef = ref<HTMLVideoElement | null>(null);
const soundAsrConfigured = ref(false);

const videoInfo = ref<{
    duration: number;
    width: number;
    height: number;
    fps: number;
} | null>(null);
const audioFile = ref("");
const segments = ref<
    (TextCutVideoSegment & { startSeconds: number; endSeconds: number })[]
>([]);
const currentIndex = ref(-1);
const searchKeyword = ref("");
const exportMode = ref<"merge" | "separate">("merge");
const exportFiles = ref<string[]>([]);
const progressMsg = ref("");
const selectedModel = ref("");
const smartMerging = ref(false);
const selectedIndexes = ref<number[]>([]);
const editingIndex = ref(-1);
const editText = ref("");
const splitIndex = ref(-1);
const splitText = ref("");

const filteredSegments = computed(() => {
    if (!searchKeyword.value.trim()) {
        return segments.value.map((seg, index) => ({
            seg,
            index,
            matched: false,
        }));
    }
    const keyword = searchKeyword.value.trim().toLowerCase();
    return segments.value.map((seg, index) => ({
        seg,
        index,
        matched: seg.text.toLowerCase().includes(keyword),
    }));
});

const includeCount = computed(
    () => segments.value.filter((s) => s.include).length,
);
const totalCount = computed(() => segments.value.length);

const isProcessing = computed(
    () =>
        phase.value === "extracting" ||
        phase.value === "recognizing" ||
        phase.value === "exporting",
);

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
            const file = await textCutVideoMerge(
                videoPath.value,
                segments.value,
            );
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
        (seg) =>
            seg.startSeconds <= currentTime && currentTime < seg.endSeconds,
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

const onTimestampClick = (
    seg: TextCutVideoSegment & { startSeconds: number; endSeconds: number },
) => {
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

const onTimestampMouseUp = (
    e: MouseEvent,
    seg: TextCutVideoSegment & { startSeconds: number; endSeconds: number },
) => {
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

const doSmartMerge = async () => {
    if (!selectedModel.value || !selectedModel.value.includes("|")) {
        Dialog.tipError("请先选择 AI 模型");
        return;
    }
    const [providerId, modelId] = selectedModel.value.split("|");

    const lines = segments.value.map((seg, i) => `[${i}] ${seg.text}`);
    const prompt = `以下是语音识别(ASR)产生的文字片段，按顺序排列，每个片段有序号。由于ASR断句不精确，部分片段存在以下问题：
1. 语义不完整的地方被截断（比如"抢单"和"第四招人留人"应该是"抢单。第四招人留人"）
2. 不该断开的地方被断开了
3. 缺少标点符号导致语义不清

请重新组织这些片段，将语义被截断的相邻片段合并，并添加正确的标点符号。

规则：
1. 每个结果片段必须包含一个或多个连续的原始片段（用 sourceIndexes 指定）
2. sourceIndexes 必须是连续的整数
3. 修正后的文字(text)需要添加正确的标点符号
4. 不要遗漏任何原始片段，所有片段都必须被包含
5. 不要改变文字的实质内容，只修正断句和标点

返回格式：
{"segments": [{"sourceIndexes": [0], "text": "修正后的文字。"}, {"sourceIndexes": [1, 2, 3], "text": "修正后的文字。"}]}

原始片段列表：
${lines.join("\n")}

请只返回 JSON，不要其他内容。`;

    smartMerging.value = true;
    try {
        const result = await modelStore.chat(providerId, modelId, prompt, {
            systemPrompt:
                "你是一个专业的中文文字编辑助手，擅长修正语音识别结果的断句和标点。只返回 JSON 格式的结果，不要包含任何其他文字。",
        });
        if (result.code !== 0 || !result.data?.content) {
            Dialog.tipError("AI 模型调用失败: " + (result.msg || "无响应"));
            smartMerging.value = false;
            return;
        }

        let content = result.data.content.trim();
        if (/^```json/.test(content)) {
            content = content
                .replace(/^```json/, "")
                .replace(/```$/, "")
                .trim();
        } else if (/^```/.test(content)) {
            content = content.replace(/^```/, "").replace(/```$/, "").trim();
        }
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            Dialog.tipError("AI 返回格式异常");
            smartMerging.value = false;
            return;
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const newSegs: { sourceIndexes: number[]; text: string }[] =
            parsed.segments || [];

        if (newSegs.length === 0) {
            Dialog.tipSuccess("AI 分析完成，无需调整");
            smartMerging.value = false;
            return;
        }

        const allIndexes = newSegs.flatMap((s) => s.sourceIndexes);
        const uniqueCount = new Set(allIndexes).size;
        if (uniqueCount !== segments.value.length) {
            Dialog.tipError("AI 返回结果不完整，请重试");
            smartMerging.value = false;
            return;
        }

        const newSegments: (TextCutVideoSegment & {
            startSeconds: number;
            endSeconds: number;
        })[] = [];
        for (const seg of newSegs) {
            const first = segments.value[seg.sourceIndexes[0]];
            const last =
                segments.value[seg.sourceIndexes[seg.sourceIndexes.length - 1]];
            newSegments.push({
                start: first.start,
                end: last.end,
                text: seg.text,
                include: true,
                startSeconds: first.startSeconds,
                endSeconds: last.endSeconds,
            });
        }

        segments.value = newSegments;
        Dialog.tipSuccess(
            `智能断句完成，${segments.value.length} → ${newSegments.length} 个片段`,
        );
    } catch (e: any) {
        Dialog.tipError("智能断句失败: " + String(e));
    }
    smartMerging.value = false;
};

const toggleSelect = (index: number) => {
    const pos = selectedIndexes.value.indexOf(index);
    if (pos >= 0) {
        selectedIndexes.value.splice(pos, 1);
    } else {
        selectedIndexes.value.push(index);
        selectedIndexes.value.sort((a, b) => a - b);
    }
};

const canMerge = computed(() => {
    if (selectedIndexes.value.length < 2) return false;
    const sorted = [...selectedIndexes.value].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    return true;
});

const doMerge = () => {
    if (!canMerge.value) return;
    const sorted = [...selectedIndexes.value].sort((a, b) => a - b);
    const first = segments.value[sorted[0]];
    const last = segments.value[sorted[sorted.length - 1]];
    const merged = {
        start: first.start,
        end: last.end,
        text: sorted.map((i) => segments.value[i].text).join(""),
        include: true,
        startSeconds: first.startSeconds,
        endSeconds: last.endSeconds,
    };
    const newSegs = [...segments.value];
    newSegs.splice(sorted[0], sorted.length, merged);
    segments.value = newSegs;
    selectedIndexes.value = [];
};

const doSplit = () => {
    if (splitIndex.value < 0 || !splitText.value.trim()) return;
    const seg = segments.value[splitIndex.value];
    const splitPos = seg.text.indexOf(splitText.value);
    if (splitPos < 0) return;
    const ratio = seg.text.length > 0 ? splitPos / seg.text.length : 0;
    const splitTime = seg.start + (seg.end - seg.start) * ratio;
    const splitSeconds =
        seg.startSeconds + (seg.endSeconds - seg.startSeconds) * ratio;
    const seg1 = {
        start: seg.start,
        end: splitTime,
        text: seg.text.substring(0, splitPos),
        include: seg.include,
        startSeconds: seg.startSeconds,
        endSeconds: splitSeconds,
    };
    const seg2 = {
        start: splitTime,
        end: seg.end,
        text: seg.text.substring(splitPos),
        include: seg.include,
        startSeconds: splitSeconds,
        endSeconds: seg.endSeconds,
    };
    const newSegs = [...segments.value];
    newSegs.splice(splitIndex.value, 1, seg1, seg2);
    segments.value = newSegs;
    splitIndex.value = -1;
    splitText.value = "";
};

const startEdit = (index: number) => {
    editingIndex.value = index;
    editText.value = segments.value[index].text;
};

const doSaveEdit = () => {
    if (editingIndex.value >= 0) {
        segments.value[editingIndex.value].text = editText.value;
        editingIndex.value = -1;
        editText.value = "";
    }
};

const doCancelEdit = () => {
    editingIndex.value = -1;
    editText.value = "";
};

const highlightText = (text: string, keyword: string): string => {
    if (!keyword.trim() || !text) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(
        new RegExp(`(${escaped})`, "gi"),
        '<mark class="tcv-highlight rounded px-0.5">$1</mark>',
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
        <div class="w-1/2 flex flex-col border-r tcv-border">
            <div class="tcv-header p-2 border-b tcv-border flex items-center">
                <div class="text-sm font-medium tcv-text flex-grow">
                    {{ $t("common.preview") }}
                </div>
                <div v-if="videoInfo" class="text-xs tcv-text-muted">
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
                    @click="
                        ($refs.videoFileSelector as any)?.$el
                            ?.querySelector('input')
                            ?.click()
                    "
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
            <div
                class="tcv-header p-2 border-b tcv-border flex items-center gap-2"
            >
                <div class="text-sm font-medium tcv-text flex-grow">
                    {{ $t("common.segment") }}
                </div>
                <div v-if="segments.length > 0" class="text-xs tcv-text-muted">
                    {{
                        $t("common.segmentCount", {
                            include: includeCount,
                            total: totalCount,
                        })
                    }}
                </div>
            </div>

            <div v-if="!soundAsrConfigured" class="p-3 border-b tcv-border">
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

            <div
                v-if="segments.length > 0"
                class="p-2 border-b tcv-border flex items-center gap-2"
            >
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

            <div
                v-if="segments.length > 0"
                class="p-2 border-b tcv-border flex items-center gap-2"
            >
                <ModelSelector
                    v-model="selectedModel"
                    style="min-width: 180px"
                />
                <a-button
                    size="small"
                    type="outline"
                    :loading="smartMerging"
                    @click="doSmartMerge"
                >
                    <icon-robot class="mr-1" />
                    智能断句
                </a-button>
                <div class="flex-grow"></div>
                <a-button
                    v-if="selectedIndexes.length > 0"
                    size="mini"
                    type="primary"
                    :disabled="!canMerge"
                    @click="doMerge"
                >
                    合并 ({{ selectedIndexes.length }})
                </a-button>
                <a-button
                    v-if="selectedIndexes.length > 0"
                    size="mini"
                    @click="selectedIndexes = []"
                >
                    取消选择
                </a-button>
                <span
                    v-if="selectedIndexes.length === 0"
                    class="text-xs tcv-text-muted"
                    >Ctrl+点击选择片段合并</span
                >
                <span class="text-xs tcv-text-muted"
                    >{{ segments.length }} 个片段</span
                >
            </div>

            <div
                v-if="splitIndex >= 0"
                class="p-2 border-b tcv-border tcv-split-bar flex items-center gap-2"
            >
                <span class="text-xs tcv-text-muted">拆分位置：</span>
                <a-input
                    v-model="splitText"
                    size="mini"
                    class="flex-grow"
                    placeholder="输入拆分点文字"
                />
                <a-button size="mini" type="primary" @click="doSplit"
                    >确认拆分</a-button
                >
                <a-button
                    size="mini"
                    @click="
                        splitIndex = -1;
                        splitText = '';
                    "
                    >取消</a-button
                >
            </div>

            <div class="flex-grow overflow-y-auto">
                <div
                    v-if="
                        segments.length === 0 &&
                        !isProcessing &&
                        soundAsrConfigured
                    "
                    class="flex flex-col items-center justify-center h-full tcv-text-muted"
                >
                    <icon-file class="text-4xl mb-2 tcv-text-muted-light" />
                    <div v-if="!videoPath" class="text-sm">
                        请在左侧选择视频文件
                    </div>
                    <div v-else class="text-sm">等待识别结果...</div>
                </div>
                <div
                    v-for="item in filteredSegments"
                    :key="item.index"
                    :data-segment-index="item.index"
                    :class="[
                        'border-b p-2 select-text tcv-border',
                        item.index === currentIndex ? 'tcv-row-active' : '',
                        selectedIndexes.includes(item.index)
                            ? 'tcv-row-selected'
                            : '',
                        item.matched === false && searchKeyword.trim()
                            ? 'opacity-40'
                            : '',
                    ]"
                    @mousedown="onRowMouseDown($event)"
                    @mouseup="onRowMouseUp($event, item.seg)"
                    @click.ctrl.stop="toggleSelect(item.index)"
                >
                    <div class="flex items-center">
                        <span
                            class="text-xs tcv-text-muted w-6 text-right mr-2 flex-shrink-0 tabular-nums"
                            >{{ item.index + 1 }}</span
                        >
                        <a-checkbox
                            :model-value="item.seg.include"
                            @click.stop
                            @change="onTextClick(item.seg)"
                            class="mr-2 flex-shrink-0"
                        />
                        <div
                            class="text-xs tcv-text-muted font-mono cursor-pointer hover:text-blue-600 hover:underline flex-shrink-0"
                            @mousedown.stop="onTimestampMouseDown($event)"
                            @mouseup.stop="onTimestampMouseUp($event, item.seg)"
                        >
                            {{
                                TimeUtil.secondsToTime(
                                    item.seg.startSeconds,
                                    true,
                                )
                            }}
                            -
                            {{
                                TimeUtil.secondsToTime(
                                    item.seg.endSeconds,
                                    true,
                                )
                            }}
                        </div>
                        <div class="flex-grow"></div>
                        <a-button
                            v-if="editingIndex !== item.index"
                            size="mini"
                            type="text"
                            @click.stop="startEdit(item.index)"
                        >
                            <icon-edit />
                        </a-button>
                        <a-button
                            v-if="editingIndex !== item.index"
                            size="mini"
                            type="text"
                            @click.stop="
                                splitIndex = item.index;
                                splitText = '';
                            "
                        >
                            <icon-scissors />
                        </a-button>
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
                        v-if="editingIndex === item.index"
                        class="mt-1 flex items-center gap-2"
                    >
                        <a-input
                            v-model="editText"
                            size="small"
                            class="flex-grow"
                            @keydown.enter="doSaveEdit"
                            @keydown.escape="doCancelEdit"
                        />
                        <a-button size="mini" type="primary" @click="doSaveEdit"
                            >保存</a-button
                        >
                        <a-button size="mini" @click="doCancelEdit"
                            >取消</a-button
                        >
                    </div>
                    <div
                        v-else
                        class="text-sm mt-1"
                        :class="
                            item.seg.include
                                ? 'tcv-text'
                                : 'tcv-text-muted line-through'
                        "
                        v-html="
                            highlightText(
                                item.seg.text || $t('common.emptySegment'),
                                searchKeyword,
                            )
                        "
                    ></div>
                </div>
            </div>

            <div
                v-if="segments.length > 0"
                class="p-2 border-t tcv-border flex items-center gap-3"
            >
                <div class="text-sm tcv-text">
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
                class="p-2 border-t tcv-border tcv-success-bar"
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
                        <span class="text-sm tcv-text flex-grow truncate">
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

<style scoped>
.tcv-border {
    border-color: #e5e7eb;
}

body[arco-theme="dark"] .tcv-border {
    border-color: #333333;
}

.tcv-header {
    background: #f9fafb;
}

body[arco-theme="dark"] .tcv-header {
    background: #232323;
}

.tcv-text {
    color: #1f2937;
}

body[arco-theme="dark"] .tcv-text {
    color: #e5e5e5;
}

.tcv-text-muted {
    color: #6b7280;
}

body[arco-theme="dark"] .tcv-text-muted {
    color: #9ca3af;
}

.tcv-text-muted-light {
    color: #9ca3af;
}

body[arco-theme="dark"] .tcv-text-muted-light {
    color: #6b7280;
}

.tcv-row-active {
    background: #eff6ff;
}

body[arco-theme="dark"] .tcv-row-active {
    background: #1e3a5f;
}

.tcv-row-selected {
    background: #eef2ff;
    box-shadow: inset 0 0 0 1px #a5b4fc;
}

body[arco-theme="dark"] .tcv-row-selected {
    background: #2d2d5e;
    box-shadow: inset 0 0 0 1px #6366f1;
}

.tcv-split-bar {
    background: #fefce8;
}

body[arco-theme="dark"] .tcv-split-bar {
    background: #3d3520;
}

.tcv-success-bar {
    background: #f0fdf4;
}

body[arco-theme="dark"] .tcv-success-bar {
    background: #1a3a2a;
}

:deep(.tcv-highlight) {
    background: #fef08a;
    color: #854d0e;
}

body[arco-theme="dark"] :deep(.tcv-highlight) {
    background: #854d0e;
    color: #fef08a;
}
</style>
