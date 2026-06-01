# TextCutVideo 文本剪辑视频 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 新建 TextCutVideo 小工具，通过语音识别提取视频文字内容，支持搜索定位、勾选/反选、合并/单独导出。

**架构：** 复用 VideoQuickCut 的步骤式任务流（ToAudio → Asr → Edit → Export → End），重新设计 Edit 步骤的编辑界面为左右分栏（视频播放器 + 搜索+文字列表），复用 ServerSelector + serverSoundAsr 进行 ASR。

**技术栈：** Vue 3 + TypeScript + Arco Design + FFmpeg + 项目 TaskService/TaskBiz 基础设施

---

## 文件结构

| 文件 | 职责 | 参考蓝本 |
|------|------|----------|
| `src/pages/Apps/TextCutVideo/type.ts` | 数据类型定义 | VideoQuickCut/type.ts |
| `src/pages/Apps/TextCutVideo/util.ts` | FFmpeg 导出工具函数 | VideoQuickCut/util.ts |
| `src/pages/Apps/TextCutVideo/task.ts` | TaskBiz 任务逻辑 | VideoQuickCut/task.ts |
| `src/pages/Apps/TextCutVideo/components/TextCutVideoParamForm.vue` | ASR 参数表单 | VideoQuickCut/components/VideoQuickCutParamForm.vue |
| `src/pages/Apps/TextCutVideo/components/TextCutVideoParamDialog.vue` | 参数弹窗 | VideoQuickCut/components/VideoQuickCutParamDialog.vue |
| `src/pages/Apps/TextCutVideo/components/TextCutVideoParamView.vue` | 参数只读展示 | VideoQuickCut/components/VideoQuickCutParamView.vue |
| `src/pages/Apps/TextCutVideo/components/TextCutVideoCreate.vue` | 创建表单 | VideoQuickCut/components/VideoQuickCutCreate.vue |
| `src/pages/Apps/TextCutVideo/components/TextCutVideoItem.vue` | 任务列表项 | VideoQuickCut/components/VideoQuickCutItem.vue |
| `src/pages/Apps/TextCutVideo/components/TextCutVideoEditDialog.vue` | **核心**：编辑弹窗（左右分栏） | VideoQuickCut/components/VideoQuickCutConfirmDialog.vue |
| `src/pages/Apps/TextCutVideo/TextCutVideo.vue` | 主页面 | VideoQuickCut/VideoQuickCut.vue |
| `src/pages/Apps/TextCutVideo/lang/zh-CN.json` | 中文国际化 | VideoQuickCut/lang/zh-CN.json |
| `src/pages/Apps/TextCutVideo/lang/en-US.json` | 英文国际化 | VideoQuickCut/lang/en-US.json |
| `src/pages/Apps/TextCutVideo/workflow/node.ts` | 工作流节点逻辑 | VideoQuickCut/workflow/node.ts |
| `src/pages/Apps/TextCutVideo/workflow/TextCutVideoNode.vue` | 工作流节点 UI | VideoQuickCut/workflow/VideoQuickCutNode.vue |
| `src/service/TaskService.ts` | 添加 TaskBiz 类型 | 已有 |
| `src/task/index.ts` | 注册 TaskBiz + Cleaner | 已有 |
| `src/pages/Apps/all.ts` | 注册到 VideoApps | 已有 |
| `src/lang/index.ts` | 注册局部 lang 文件到全局 i18n | 已有 |

---

### 任务 1：创建类型定义

**文件：**
- 创建：`src/pages/Apps/TextCutVideo/type.ts`
- 修改：`src/service/TaskService.ts`（添加 `"TextCutVideo"` 到 TaskBiz 联合类型）

- [ ] **步骤 1：创建 type.ts**

```typescript
import { TaskJobResultStepStatus } from "../../../service/TaskService";

export type TextCutVideoSegment = {
    start: number;
    end: number;
    text: string;
    include: boolean;
};

export type TextCutVideoModelConfigType = {
    video: string;
    soundAsr: SoundAsrParamType;
};

export type TextCutVideoJobResultType = {
    step: "ToAudio" | "Asr" | "Edit" | "Export" | "End";

    ToAudio: {
        status: TaskJobResultStepStatus;
        file: string;
        duration: number;
        width: number;
        height: number;
        fps: number;
    };

    Asr: {
        status: TaskJobResultStepStatus;
        start: number;
        end: number;
        records: { start: number; end: number; text: string }[];
    };

    Edit: {
        status: TaskJobResultStepStatus;
        records: TextCutVideoSegment[];
        exportMode: "merge" | "separate";
    };

    Export: {
        status: TaskJobResultStepStatus;
        files: string[];
    };
};
```

- [ ] **步骤 2：在 TaskService.ts 的 TaskBiz 联合类型中添加 `"TextCutVideo"`**

在 `src/service/TaskService.ts` 的 TaskBiz 类型中，在 `| "Ffmpeg"` 之后、`| "Workflow"` 之前添加：

```typescript
    | "TextCutVideo"
```

- [ ] **步骤 3：Commit**

```bash
git add src/pages/Apps/TextCutVideo/type.ts src/service/TaskService.ts
git commit -m "feat(TextCutVideo): add type definitions and TaskBiz registration"
```

---

### 任务 2：创建导出工具函数

**文件：**
- 创建：`src/pages/Apps/TextCutVideo/util.ts`

- [ ] **步骤 1：创建 util.ts**

提供两个导出函数：`textCutVideoMerge`（合并导出）和 `textCutVideoSeparate`（单独导出）。

```typescript
import { t } from "../../../lang";
import { ffmpegOptimized } from "../../../lib/ffmpeg";
import { TextCutVideoSegment } from "./type";

export const textCutVideoMerge = async (
    videoPath: string,
    segments: TextCutVideoSegment[],
): Promise<string> => {
    const outputFile = await $mapi.file.temp("mp4");

    const includeSegments = segments.filter((seg) => seg.include);

    if (includeSegments.length === 0) {
        throw new Error(t("error.noSegmentSelected"));
    }

    let ffmpegArgs: string[] = ["-i", videoPath];

    const filterParts: string[] = [];
    for (let i = 0; i < includeSegments.length; i++) {
        const seg = includeSegments[i];
        filterParts.push(
            `[0:v]trim=start=${seg.start / 1000}:end=${seg.end / 1000},setpts=PTS-STARTPTS[v${i}]`,
        );
        filterParts.push(
            `[0:a]atrim=start=${seg.start / 1000}:end=${seg.end / 1000},asetpts=PTS-STARTPTS[a${i}]`,
        );
    }

    const videoInputs = includeSegments.map((_, i) => `[v${i}]`).join("");
    const audioInputs = includeSegments.map((_, i) => `[a${i}]`).join("");
    filterParts.push(
        `${videoInputs}concat=n=${includeSegments.length}:v=1:a=0[outv]`,
    );
    filterParts.push(
        `${audioInputs}concat=n=${includeSegments.length}:v=0:a=1[outa]`,
    );

    ffmpegArgs.push("-filter_complex", filterParts.join(";"));
    ffmpegArgs.push("-map", "[outv]", "-map", "[outa]");
    ffmpegArgs.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "0");
    ffmpegArgs.push("-c:a", "aac");
    ffmpegArgs.push("-y", outputFile);

    await ffmpegOptimized(ffmpegArgs, { successFileCheck: outputFile });

    return outputFile;
};

export const textCutVideoSeparate = async (
    videoPath: string,
    segments: TextCutVideoSegment[],
): Promise<string[]> => {
    const includeSegments = segments.filter((seg) => seg.include);

    if (includeSegments.length === 0) {
        throw new Error(t("error.noSegmentSelected"));
    }

    const files: string[] = [];
    for (let i = 0; i < includeSegments.length; i++) {
        const seg = includeSegments[i];
        const outputFile = await $mapi.file.temp("mp4");
        const ffmpegArgs: string[] = [
            "-i", videoPath,
            "-ss", (seg.start / 1000).toString(),
            "-to", (seg.end / 1000).toString(),
            "-c", "copy",
            "-y", outputFile,
        ];
        await ffmpegOptimized(ffmpegArgs, { successFileCheck: outputFile });
        files.push(outputFile);
    }

    return files;
};
```

- [ ] **步骤 2：Commit**

```bash
git add src/pages/Apps/TextCutVideo/util.ts
git commit -m "feat(TextCutVideo): add export utility functions (merge & separate)"
```

---

### 任务 3：创建任务逻辑

**文件：**
- 创建：`src/pages/Apps/TextCutVideo/task.ts`

- [ ] **步骤 1：创建 task.ts**

对标 VideoQuickCut/task.ts，实现 TaskBiz 的 runFunc / successFunc / failFunc / update，步骤流为 ToAudio → Asr → Edit → Export → End。

```typescript
import { t } from "../../../lang";
import { ffmpegVideoToAudio } from "../../../lib/ffmpeg";
import { ffprobeVideoInfo } from "../../../lib/ffprobe";
import { serverSoundAsr } from "../../../lib/server";
import {
    TaskRecord,
    TaskService,
    TaskType,
} from "../../../service/TaskService";
import { useServerStore } from "../../../store/modules/server";
import { TaskBiz, useTaskStore } from "../../../store/modules/task";
import {
    TextCutVideoJobResultType,
    TextCutVideoModelConfigType,
} from "./type";
import { textCutVideoMerge, textCutVideoSeparate } from "./util";

import { createTaskRunResult } from "../common/lib";
import { TaskRunResult } from "../common/type";

const serverStore = useServerStore();
const taskStore = useTaskStore();

export const TextCutVideoRun = async (data: {
    taskId: string;
    title: string;
    video: string;
    soundAsr: SoundAsrParamType;
}): Promise<{
    taskId: string;
    result: () => Promise<TaskRunResult>;
}> => {
    let taskId = data.taskId;
    if (!taskId) {
        const record: TaskRecord = {
            type: TaskType.System,
            biz: "TextCutVideo",
            title: data.title,
            serverName: "",
            serverTitle: "",
            serverVersion: "",
            modelConfig: {
                video: data.video,
                soundAsr: data.soundAsr,
            },
            param: {},
        };
        taskId = await TaskService.submit(record);
    }
    return {
        taskId,
        result: await createTaskRunResult(taskId, (resultData, task) => {
            resultData.video = task.result?.url;
        }),
    };
};

export const TextCutVideoCleaner = async (task: TaskRecord) => {
    const files: string[] = [];
    const jobResult: TextCutVideoJobResultType = task.jobResult;
    if (jobResult.ToAudio?.file) {
        files.push(jobResult.ToAudio.file);
    }
    if (jobResult.Export?.files) {
        files.push(...jobResult.Export.files);
    }
    return { files };
};

export const TextCutVideo: TaskBiz = {
    runFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const modelConfig: TextCutVideoModelConfigType = record.modelConfig;
        const jobResult: TextCutVideoJobResultType = record.jobResult;

        jobResult.step = jobResult.step || "ToAudio";
        jobResult.ToAudio = jobResult.ToAudio || { status: "queue" };
        jobResult.Asr = jobResult.Asr || { status: "queue" };
        jobResult.Edit = jobResult.Edit || { status: "queue" };
        jobResult.Export = jobResult.Export || { status: "queue" };

        if (jobResult.step === "ToAudio") {
            jobResult.ToAudio.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "TextCutVideo", bizId }, "running");

            const { duration, width, height, fps } = await ffprobeVideoInfo(
                modelConfig.video,
            );
            jobResult.ToAudio.duration = duration;
            jobResult.ToAudio.width = width;
            jobResult.ToAudio.height = height;
            jobResult.ToAudio.fps = fps;

            const audioFile = await ffmpegVideoToAudio(modelConfig.video);
            jobResult.ToAudio.file = await $mapi.file.hubSave(audioFile);

            jobResult.step = "Asr";
            jobResult.ToAudio.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Asr") {
            jobResult.Asr.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "TextCutVideo", bizId }, "running");

            const ret = await serverSoundAsr(
                "TextCutVideo",
                bizId,
                modelConfig.soundAsr,
                jobResult.Asr,
                jobResult.ToAudio.file,
            );

            if (ret.type === "retry") {
                return ret.type;
            }

            jobResult.Asr.start = ret.start;
            jobResult.Asr.end = ret.end;
            jobResult.Asr.records = ret.records;

            jobResult.step = "Edit";
            jobResult.Asr.status = "success";
            await TaskService.update(bizId, { jobResult });
        }

        if (jobResult.step === "Edit") {
            jobResult.Edit.status = "running";
            jobResult.Edit.records = jobResult.Asr.records.map((record) => ({
                start: record.start,
                end: record.end,
                text: record.text,
                include: record.text ? true : false,
            }));
            jobResult.Edit.exportMode = "merge";
            jobResult.Edit.status = "pending";
            await TaskService.update(bizId, { jobResult });
            return "success";
        }

        if (jobResult.step === "Export") {
            jobResult.Edit.status = "success";
            jobResult.Export.status = "running";
            await TaskService.update(bizId, {
                status: "running",
                jobResult,
            });
            taskStore.fireChange({ biz: "TextCutVideo", bizId }, "running");

            try {
                let files: string[];
                if (jobResult.Edit.exportMode === "merge") {
                    const file = await textCutVideoMerge(
                        modelConfig.video,
                        jobResult.Edit.records,
                    );
                    files = [await $mapi.file.hubSave(file)];
                } else {
                    const rawFiles = await textCutVideoSeparate(
                        modelConfig.video,
                        jobResult.Edit.records,
                    );
                    files = [];
                    for (const f of rawFiles) {
                        files.push(await $mapi.file.hubSave(f));
                    }
                }
                jobResult.Export.files = files;
                jobResult.step = "End";
                jobResult.Export.status = "success";
                await TaskService.update(bizId, { jobResult });
                return "success";
            } catch (error) {
                console.error("TextCutVideo export error:", error);
                throw error;
            }
        }

        if (jobResult.step === "End") {
            return "success";
        }

        throw `TextCutVideo.runFunc: unknown jobResult.step: ${jobResult.step}`;
    },
    successFunc: async (bizId, bizParam) => {
        const { record } = await serverStore.prepareForTask(bizId, bizParam);
        const jobResult: TextCutVideoJobResultType = record.jobResult;
        if (jobResult.step === "Edit") {
            await TaskService.update(bizId, {
                status: "pause",
                statusMsg: t("msg.taskNotCompleteConfirmSegments"),
            });
        } else if (jobResult.step === "End") {
            await TaskService.update(bizId, {
                status: "success",
                endTime: Date.now(),
                result: {
                    url: await $mapi.file.hubSave(jobResult.Export.files[0]),
                },
            });
        } else {
            $mapi.log.error(
                "TextCutVideo.successFunc: unknown jobResult.step",
                jobResult.step,
            );
        }
    },
    failFunc: async (bizId, msg, bizParam) => {
        await TaskService.update(bizId, {
            status: "fail",
            statusMsg: msg,
            endTime: Date.now(),
        });
    },
    update: async (bizId, data, bizParam) => {
        console.log("TextCutVideo.update", { bizId, data, bizParam });
    },
};
```

- [ ] **步骤 2：在 src/task/index.ts 中注册**

在 import 区域添加：

```typescript
import {
    TextCutVideo,
    TextCutVideoCleaner,
} from "../pages/Apps/TextCutVideo/task";
```

在 `tasks` 对象中添加：

```typescript
    TextCutVideo,
```

在 `taskCleaners` 对象中添加：

```typescript
    TextCutVideo: TextCutVideoCleaner,
```

- [ ] **步骤 3：Commit**

```bash
git add src/pages/Apps/TextCutVideo/task.ts src/task/index.ts
git commit -m "feat(TextCutVideo): add task logic and register TaskBiz"
```

---

### 任务 4：创建基础组件（ParamForm / ParamDialog / ParamView）

**文件：**
- 创建：`src/pages/Apps/TextCutVideo/components/TextCutVideoParamForm.vue`
- 创建：`src/pages/Apps/TextCutVideo/components/TextCutVideoParamDialog.vue`
- 创建：`src/pages/Apps/TextCutVideo/components/TextCutVideoParamView.vue`

这三个组件与 VideoQuickCut 的同名组件几乎完全一致，只是名称不同。

- [ ] **步骤 1：创建 TextCutVideoParamForm.vue**

直接复用 SoundAsrForm，与 VideoQuickCutParamForm.vue 相同模式：

```vue
<script setup lang="ts">
import { ref } from "vue";
import SoundAsrForm from "../../../Video/components/SoundAsrForm.vue";

const soundAsrForm = ref<InstanceType<typeof SoundAsrForm>>();

type TextCutVideoForm = {
    soundAsr: SoundAsrParamType;
};

const getValue = async (): Promise<TextCutVideoForm | undefined> => {
    const data: any = {};
    data.soundAsr = await soundAsrForm.value?.getValue();
    if (!data.soundAsr) {
        return;
    }
    return data;
};

const setValue = (data: Partial<TextCutVideoForm>) => {
    if (data.soundAsr !== undefined) {
        soundAsrForm.value?.setValue(data.soundAsr);
    }
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <SoundAsrForm ref="soundAsrForm" />
</template>
```

- [ ] **步骤 2：创建 TextCutVideoParamDialog.vue**

```vue
<script setup lang="ts">
import { nextTick, ref } from "vue";
import TextCutVideoParamForm from "./TextCutVideoParamForm.vue";

const paramForm = ref<InstanceType<typeof TextCutVideoParamForm>>();

const visible = ref(false);
const emit = defineEmits<{
    update: [
        data: {
            soundAsr: SoundAsrParamType;
        },
    ];
}>();
const doSubmit = async () => {
    const value = await paramForm.value?.getValue();
    if (!value) {
        return;
    }
    visible.value = false;
    emit("update", {
        soundAsr: value.soundAsr,
    });
};

defineExpose({
    show: (data?: any) => {
        visible.value = true;
        nextTick(() => {
            if (data) {
                paramForm.value?.setValue(data);
            }
        });
    },
});
</script>

<template>
    <a-modal
        v-model:visible="visible"
        title-align="start"
        :title="$t('common.setting2')"
        width="600px"
        :destroyOnClose="true"
    >
        <template #footer>
            <div class="flex justify-end space-x-2">
                <a-button type="primary" @click="doSubmit">{{
                    $t("common.save")
                }}</a-button>
            </div>
        </template>
        <div
            v-if="visible"
            class="space-y-4 overflow-y-auto"
            style="max-height: calc(100vh - 10rem)"
        >
            <TextCutVideoParamForm ref="paramForm" />
        </div>
    </a-modal>
</template>
```

- [ ] **步骤 3：创建 TextCutVideoParamView.vue**

```vue
<script setup lang="ts">
import SoundAsrFormView from "../../../Video/components/SoundAsrFormView.vue";

const props = defineProps<{
    data: {
        soundAsr?: SoundAsrParamType;
    };
}>();
</script>

<template>
    <SoundAsrFormView :data="props.data.soundAsr" />
</template>
```

- [ ] **步骤 4：Commit**

```bash
git add src/pages/Apps/TextCutVideo/components/TextCutVideoParamForm.vue src/pages/Apps/TextCutVideo/components/TextCutVideoParamDialog.vue src/pages/Apps/TextCutVideo/components/TextCutVideoParamView.vue
git commit -m "feat(TextCutVideo): add param form, dialog and view components"
```

---

### 任务 5：创建 TextCutVideoCreate 组件

**文件：**
- 创建：`src/pages/Apps/TextCutVideo/components/TextCutVideoCreate.vue`

- [ ] **步骤 1：创建 TextCutVideoCreate.vue**

对标 VideoQuickCutCreate.vue，选择视频文件 + ASR 参数 + 提交：

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import FileSelector from "../../../../components/common/FileSelector.vue";
import { dataAutoSaveDraft } from "../../../../components/common/util";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";
import { TaskRecord, TaskService } from "../../../../service/TaskService";
import TextCutVideoParamForm from "./TextCutVideoParamForm.vue";

const emit = defineEmits<{
    submitted: [];
}>();

const paramForm = ref<InstanceType<typeof TextCutVideoParamForm> | null>(null);

const formData = ref({
    video: "",
});

const { clearDraft } = dataAutoSaveDraft(
    "TextCutVideoCreate.formData",
    formData.value,
);

const doSubmit = async () => {
    const textCutVideoValue = await paramForm.value?.getValue();
    if (!textCutVideoValue) {
        return;
    }
    if (!formData.value.video) {
        Dialog.tipError(t("error.selectVideoFile"));
        return;
    }
    const taskTitle = $mapi.file.pathToName(formData.value.video, false);
    const record: TaskRecord = {
        biz: "TextCutVideo",
        title: taskTitle,
        serverName: "",
        serverTitle: "",
        serverVersion: "",
        modelConfig: {
            video: formData.value.video,
            ...textCutVideoValue,
        },
        param: {},
    };
    const id = await TaskService.submit(record);
    formData.value.video = "";
    emit("submitted");
    Dialog.tipSuccess(t("common.taskSubmitted"));
    clearDraft();
    return id;
};
</script>

<template>
    <div class="rounded-xl shadow border p-4">
        <div class="mb-4 flex items-start">
            <div class="pt-1 w-5">
                <a-tooltip :content="$t('common.videoFile')" mini>
                    <icon-video-camera />
                </a-tooltip>
            </div>
            <div class="flex items-center gap-2">
                <FileSelector :extensions="['mp4']" v-model="formData.video" />
            </div>
        </div>
        <TextCutVideoParamForm ref="paramForm" />
        <div class="flex">
            <a-button class="mr-2" type="primary" @click="doSubmit">
                <icon-send class="mr-2" />
                {{ $t("common.submitTask") }}
            </a-button>
        </div>
    </div>
</template>
```

- [ ] **步骤 2：Commit**

```bash
git add src/pages/Apps/TextCutVideo/components/TextCutVideoCreate.vue
git commit -m "feat(TextCutVideo): add create form component"
```

---

### 任务 6：创建核心编辑界面 TextCutVideoEditDialog

**文件：**
- 创建：`src/pages/Apps/TextCutVideo/components/TextCutVideoEditDialog.vue`

这是整个工具的核心组件。左右分栏布局：左侧视频播放器，右侧搜索+文字列表+导出选项。

- [ ] **步骤 1：创建 TextCutVideoEditDialog.vue**

```vue
<script setup lang="ts">
import { nextTick, ref, computed, watch } from "vue";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";
import { TimeUtil } from "../../../../lib/util";
import { TextCutVideoSegment } from "../type";

type EditSegment = TextCutVideoSegment & {
    startSeconds: number;
    endSeconds: number;
};

const props = defineProps({
    saveTitle: {
        type: String,
        default: () => t("common.save"),
    },
});

const emit = defineEmits<{
    save: [
        taskId: number,
        records: TextCutVideoSegment[],
        exportMode: "merge" | "separate",
    ];
}>();

const visible = ref(false);
const currentTaskId = ref<number>(0);
const currentVideo = ref<string>("");
const currentDuration = ref<number>(0);
const currentRecords = ref<EditSegment[]>([]);
const currentIndex = ref<number>(-1);
const searchKeyword = ref("");
const exportMode = ref<"merge" | "separate">("merge");
const videoRef = ref<HTMLVideoElement | null>(null);

const filteredRecords = computed(() => {
    if (!searchKeyword.value.trim()) {
        return currentRecords.value.map((record, index) => ({
            record,
            index,
            matched: false,
        }));
    }
    const keyword = searchKeyword.value.trim().toLowerCase();
    return currentRecords.value.map((record, index) => ({
        record,
        index,
        matched: record.text.toLowerCase().includes(keyword),
    }));
});

const includeCount = computed(() =>
    currentRecords.value.filter((seg) => seg.include).length,
);
const totalCount = computed(() => currentRecords.value.length);

const edit = (
    taskId: number,
    video: string,
    duration: number,
    records: TextCutVideoSegment[],
    mode: "merge" | "separate",
) => {
    currentTaskId.value = taskId || 0;
    currentVideo.value = `file://${video}`;
    currentDuration.value = duration || 0;
    currentIndex.value = -1;
    searchKeyword.value = "";
    exportMode.value = mode || "merge";
    currentRecords.value = records.map((record) => ({
        ...record,
        startSeconds: record.start / 1000,
        endSeconds: record.end / 1000,
    }));
    visible.value = true;
};

defineExpose({
    edit,
});

const doSave = () => {
    const includeCountVal = currentRecords.value.filter(
        (seg) => seg.include,
    ).length;
    if (includeCountVal === 0) {
        Dialog.tipError(t("error.noSegmentSelected"));
        return;
    }
    const finalRecords = currentRecords.value.map((record) => ({
        start: record.start,
        end: record.end,
        text: record.text,
        include: record.include,
    }));
    emit("save", currentTaskId.value, finalRecords, exportMode.value);
    visible.value = false;
};

const doCancel = () => {
    visible.value = false;
    currentRecords.value = [];
    currentIndex.value = -1;
};

const onTimeUpdate = () => {
    const currentTime = videoRef.value?.currentTime || 0;
    const newIndex = currentRecords.value.findIndex(
        (record) =>
            record.startSeconds <= currentTime &&
            currentTime < record.endSeconds,
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

const onTimestampClick = (record: EditSegment) => {
    if (videoRef.value) {
        videoRef.value.currentTime = record.startSeconds;
        videoRef.value.play();
    }
};

const onTextClick = (record: EditSegment) => {
    record.include = !record.include;
};

const onToggleAll = (includeAll: boolean) => {
    currentRecords.value.forEach((segment) => {
        segment.include = includeAll;
    });
};

const onInvertSelection = () => {
    currentRecords.value.forEach((segment) => {
        segment.include = !segment.include;
    });
};
</script>

<template>
    <a-modal v-model:visible="visible" width="95vw" title-align="start">
        <template #title>{{ $t("common.manualEditSegment") }}</template>
        <template #footer>
            <a-button @click="doCancel">{{ $t("common.cancel") }}</a-button>
            <a-button type="primary" @click="doSave">{{
                props.saveTitle
            }}</a-button>
        </template>
        <div
            v-if="visible"
            class="flex gap-2 h-full -mx-4 -my-5"
            style="height: calc(100vh - 15rem)"
        >
            <div class="w-1/2 flex flex-col">
                <div
                    class="bg-gray-100 p-2 border-b rounded-lg flex items-center"
                >
                    <div class="text-sm font-medium text-gray-700 flex-grow">
                        {{ $t("common.preview") }}
                    </div>
                </div>
                <div class="flex-grow rounded-lg border p-1">
                    <video
                        ref="videoRef"
                        :src="currentVideo"
                        controls
                        class="w-full h-full bg-black"
                        @timeupdate="onTimeUpdate"
                    ></video>
                </div>
            </div>
            <div class="w-1/2 flex flex-col">
                <div
                    class="bg-gray-100 p-2 border-b rounded-lg flex items-center gap-2"
                >
                    <div class="text-sm font-medium text-gray-700 flex-grow">
                        {{ $t("common.segment") }}
                    </div>
                    <div class="text-xs text-gray-500">
                        {{ $t("common.segmentCount", { include: includeCount, total: totalCount }) }}
                    </div>
                </div>
                <div class="p-2 border-b flex items-center gap-2">
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
                    class="flex-grow space-y-1 overflow-y-auto border p-1 rounded-lg"
                >
                    <div
                        v-for="item in filteredRecords"
                        :key="item.index"
                        :data-segment-index="item.index"
                        :class="[
                            'border rounded p-1 hover:shadow mb-1',
                            item.index === currentIndex ? 'bg-blue-50' : '',
                            item.record.include
                                ? 'border-green-200'
                                : 'border-red-200',
                            item.matched === false && searchKeyword.trim()
                                ? 'opacity-40'
                                : '',
                        ]"
                    >
                        <div class="flex items-start">
                            <div class="flex-grow">
                                <div class="flex items-center">
                                    <div
                                        class="text-xs text-gray-600 font-mono select-none cursor-pointer hover:text-blue-600 hover:underline"
                                        @click="onTimestampClick(item.record)"
                                    >
                                        {{
                                            TimeUtil.secondsToTime(
                                                item.record.startSeconds,
                                                true,
                                            )
                                        }}
                                        -
                                        {{
                                            TimeUtil.secondsToTime(
                                                item.record.endSeconds,
                                                true,
                                            )
                                        }}
                                    </div>
                                    <div class="flex-grow"></div>
                                    <a-tag
                                        :color="
                                            item.record.include
                                                ? 'green'
                                                : 'red'
                                        "
                                        size="small"
                                    >
                                        {{
                                            item.record.include
                                                ? $t("common.include")
                                                : $t("common.exclude")
                                        }}
                                    </a-tag>
                                </div>
                                <div
                                    class="text-xs pt-1 cursor-pointer select-none"
                                    @click="onTextClick(item.record)"
                                >
                                    {{
                                        item.record.text ||
                                        $t("common.emptySegment")
                                    }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="p-2 border-t flex items-center gap-4">
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
                </div>
            </div>
        </div>
    </a-modal>
</template>
```

- [ ] **步骤 2：Commit**

```bash
git add src/pages/Apps/TextCutVideo/components/TextCutVideoEditDialog.vue
git commit -m "feat(TextCutVideo): add edit dialog with search, video playback, and selection"
```

---

### 任务 7：创建 TextCutVideoItem 组件

**文件：**
- 创建：`src/pages/Apps/TextCutVideo/components/TextCutVideoItem.vue`

- [ ] **步骤 1：创建 TextCutVideoItem.vue**

对标 VideoQuickCutItem.vue，展示任务步骤进度，Edit 步骤提供「编辑」按钮打开 TextCutVideoEditDialog：

```vue
<script setup lang="ts">
import { ref } from "vue";
import TaskCancelAction from "../../../../components/Server/TaskCancelAction.vue";
import TaskContinueAction from "../../../../components/Server/TaskContinueAction.vue";
import TaskDeleteAction from "../../../../components/Server/TaskDeleteAction.vue";
import TaskDownloadAction from "../../../../components/Server/TaskDownloadAction.vue";
import TaskDuration from "../../../../components/Server/TaskDuration.vue";
import TaskTitleField from "../../../../components/Server/TaskTitleField.vue";
import TaskBizStatus from "../../../../components/common/TaskBizStatus.vue";
import TaskJobResultStepView from "../../../../components/common/TaskJobResultStepView.vue";
import { TaskRecord, TaskService } from "../../../../service/TaskService";
import { useTaskStore } from "../../../../store/modules/task";
import VideoInfo from "../../common/VideoInfo.vue";
import {
    TextCutVideoJobResultType,
    TextCutVideoModelConfigType,
    TextCutVideoSegment,
} from "../type";
import TextCutVideoEditDialog from "./TextCutVideoEditDialog.vue";
import VideoPreviewBox from "../../../../components/common/VideoPreviewBox.vue";

const props = defineProps<{
    record: TaskRecord<
        TextCutVideoModelConfigType,
        TextCutVideoJobResultType
    >;
    dialog: boolean;
    onRefresh: () => void;
}>();
const taskStore = useTaskStore();

const textCutVideoEditDialog = ref<InstanceType<
    typeof TextCutVideoEditDialog
> | null>(null);

const onEdit = async (
    taskId: number,
    records: TextCutVideoSegment[],
    exportMode: "merge" | "separate",
) => {
    await TaskService.update(taskId, {
        statusMsg: "",
        jobResult: {
            step: "Export",
            Edit: { records, exportMode },
        },
    });
    await taskStore.dispatch("TextCutVideo", taskId + "");
    props.onRefresh();
};
</script>

<template>
    <div class="rounded-xl shadow border p-4 mb-4 hover:shadow-lg">
        <div class="flex items-center gap-1">
            <div
                class="inline-flex items-start bg-blue-100 rounded-full px-2 leading-8 h-8 mr-2"
            >
                <div v-if="!dialog" class="mr-2 h-8 pt-0.5">
                    <a-checkbox v-model="record['_check']" />
                </div>
                <div class="">
                    <TaskTitleField
                        :record="record"
                        :disabled="dialog"
                        @title-click="record['_check'] = !record['_check']"
                        @update="(v) => (record.title = v)"
                    />
                </div>
            </div>
            <div class="flex-grow"></div>
            <TaskDuration :start="record.startTime" :end="record.endTime" />
            <TaskBizStatus
                :status="record.status"
                :status-msg="record.statusMsg"
            />
        </div>
        <div class="mt-3 flex items-center">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-video-camera />
                    {{ $t("common.convertAudio") }}
                </div>
            </div>
            <div class="flex-grow">
                <TaskJobResultStepView :record="record" step="ToAudio">
                    <div class="flex gap-1">
                        <VideoInfo :data="record.jobResult?.ToAudio! as any" />
                    </div>
                </TaskJobResultStepView>
            </div>
        </div>
        <div class="mt-3 flex items-center">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-sound />
                    {{ $t("common.speechRecognition") }}
                </div>
            </div>
            <div class="flex-grow">
                <TaskJobResultStepView :record="record" step="Asr">
                    <div>
                        <a-tag class="rounded-lg">
                            {{
                                $t("common.recognizedSegments", {
                                    count: (record.jobResult?.Asr.records || [])
                                        .length,
                                })
                            }}
                        </a-tag>
                    </div>
                </TaskJobResultStepView>
            </div>
        </div>
        <div class="mt-3 flex items-center">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-edit />
                    {{ $t("common.textEdit") }}
                </div>
            </div>
            <div class="flex-grow">
                <TaskJobResultStepView :record="record" step="Edit">
                    <template #successPending>
                        <div class="mb-1">
                            <a-button
                                type="primary"
                                @click="
                                    textCutVideoEditDialog?.edit(
                                        record.id!,
                                        record.modelConfig!.video!,
                                        Math.floor(
                                            record.jobResult?.ToAudio!
                                                .duration! * 1000,
                                        ),
                                        record.jobResult?.Edit!.records!,
                                        record.jobResult?.Edit!.exportMode ||
                                            'merge',
                                    )
                                "
                            >
                                <template #icon>
                                    <icon-pen />
                                </template>
                                {{ $t("common.editTextSegments") }}
                            </a-button>
                        </div>
                    </template>
                </TaskJobResultStepView>
            </div>
        </div>
        <div class="mt-3 flex">
            <div class="w-24 flex-shrink-0">
                <div class="inline-block text-center">
                    <icon-video-camera />
                    {{ $t("common.videoExport") }}
                </div>
            </div>
            <TaskJobResultStepView :record="record" step="Export">
                <div>
                    <VideoPreviewBox :url="record.jobResult?.Export?.files?.[0]!" />
                </div>
            </TaskJobResultStepView>
        </div>
        <div class="pt-4 flex items-center">
            <div class="text-gray-400 text-xs mr-2">#{{ record.id }}</div>
            <div class="text-gray-400 flex-grow">
                <timeago :datetime="record['createdAt'] * 1000" />
            </div>
            <div class="">
                <TaskDownloadAction :record="record" />
                <TaskDeleteAction
                    v-if="!dialog"
                    :record="record"
                    @update="onRefresh"
                />
                <TaskContinueAction :record="record" @update="onRefresh" />
                <TaskCancelAction :record="record" />
            </div>
        </div>
    </div>
    <TextCutVideoEditDialog
        ref="textCutVideoEditDialog"
        :save-title="$t('common.saveModify')"
        @save="onEdit"
    />
</template>
```

- [ ] **步骤 2：Commit**

```bash
git add src/pages/Apps/TextCutVideo/components/TextCutVideoItem.vue
git commit -m "feat(TextCutVideo): add task item component with edit dialog integration"
```

---

### 任务 8：创建主页面 TextCutVideo.vue

**文件：**
- 创建：`src/pages/Apps/TextCutVideo/TextCutVideo.vue`

- [ ] **步骤 1：创建 TextCutVideo.vue**

对标 VideoQuickCut.vue，展示步骤说明 + 创建表单 + 任务列表：

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { t } from "../../../lang";
import TaskBatchDeleteAction from "../../../components/Server/TaskBatchDeleteAction.vue";
import TaskBatchDownloadAction from "../../../components/Server/TaskBatchDownloadAction.vue";
import ToggleButton from "../../../components/common/ToggleButton.vue";
import { useCheckAll } from "../../../components/common/check-all";
import { usePaginate } from "../../../hooks/paginate";
import { useTaskChangeRefresh } from "../../../hooks/task";
import { TaskRecord, TaskService } from "../../../service/TaskService";
import { TaskChangeType, useTaskStore } from "../../../store/modules/task";
import Steps from "../common/Steps.vue";
import TextCutVideoCreate from "./components/TextCutVideoCreate.vue";
import TextCutVideoItem from "./components/TextCutVideoItem.vue";
import ListerTop from "../../../components/common/ListerTop.vue";
import MEmpty from "../../../components/common/MEmpty.vue";
import PageHeader from "../../../components/PageHeader.vue";

const { page, records, recordsForPage } = usePaginate<TaskRecord>({
    pageSize: 10,
});

useTaskChangeRefresh("TextCutVideo", (bizId: string, type: TaskChangeType) => {
    doRefresh();
});

const { mergeCheck, isIndeterminate, isAllChecked, onCheckAll, checkRecords } =
    useCheckAll({
        records: recordsForPage,
    });

const stepsVisible = ref(false);
const taskStore = useTaskStore();

onMounted(async () => {
    await doRefresh();
});

onUnmounted(() => {});

const doRefresh = async () => {
    const rawRecords = await TaskService.list("TextCutVideo");
    records.value = mergeCheck(rawRecords);
};
</script>

<template>
    <div class="p-5">
        <PageHeader
            title="文本剪辑视频"
            desc="通过语音识别提取视频文字内容，支持搜索定位、勾选剪辑导出"
        >
            <template #actions
                ><ToggleButton v-model="stepsVisible"
            /></template>
        </PageHeader>
        <Steps
            v-if="stepsVisible"
            :steps="[
                {
                    key: 1,
                    label: '选择视频',
                    description: '选择需要进行文字剪辑的视频文件',
                },
                {
                    key: 2,
                    label: '语音识别',
                    description: '对视频进行语音识别，提取文字内容',
                },
                {
                    key: 3,
                    label: '文字编辑',
                    description: '搜索文字、勾选需要的片段、选择导出方式',
                },
                {
                    key: 4,
                    label: '导出视频',
                    description: '根据选择导出剪辑后的视频文件',
                },
            ]"
        />
        <div>
            <TextCutVideoCreate @submitted="doRefresh" />
            <ListerTop
                class="mt-4"
                :total="records.length"
                @refresh="doRefresh"
            >
                <a-checkbox
                    :model-value="isAllChecked"
                    :indeterminate="isIndeterminate"
                    @change="onCheckAll"
                >
                    {{ $t("common.selectAll") }}
                </a-checkbox>
                <TaskBatchDeleteAction
                    :records="checkRecords"
                    @update="doRefresh"
                />
                <TaskBatchDownloadAction :records="checkRecords" />
                <template #actions>
                    <a-pagination
                        v-model:current="page"
                        :total="records.length"
                        :page-size="10"
                        show-total
                        simple
                    />
                </template>
            </ListerTop>
            <div v-if="records.length > 0">
                <div v-for="r in recordsForPage" :key="r.id">
                    <TextCutVideoItem
                        :record="r"
                        :dialog="false"
                        :on-refresh="doRefresh"
                    />
                </div>
            </div>
            <m-empty v-else />
        </div>
    </div>
</template>
```

- [ ] **步骤 2：Commit**

```bash
git add src/pages/Apps/TextCutVideo/TextCutVideo.vue
git commit -m "feat(TextCutVideo): add main page component"
```

---

### 任务 9：创建国际化文件并注册到全局 i18n

**文件：**
- 创建：`src/pages/Apps/TextCutVideo/lang/zh-CN.json`
- 创建：`src/pages/Apps/TextCutVideo/lang/en-US.json`
- 修改：`src/lang/index.ts`（导入并注册 lang 文件）

注意：项目的 i18n 机制是把所有局部 lang JSON 通过 spread operator 合并到全局 message 中的。必须同时创建文件并在 `src/lang/index.ts` 中注册，否则 key 不会被加载。

- [ ] **步骤 1：创建 zh-CN.json**

包含计划中所有组件使用的、全局 zh-CN.json 中不存在的 key：

```json
{
    "common.deSelectAll": "全不选",
    "common.preview": "预览",
    "common.videoExport": "视频导出",
    "common.convertAudio": "转换音频",
    "common.speechRecognition": "语音识别",
    "common.textEdit": "文字编辑",
    "common.editTextSegments": "编辑文字片段",
    "common.include": "包含",
    "common.exclude": "排除",
    "common.segmentCount": "已选择 {include} / {total} 个片段",
    "common.manualEditSegment": "文字剪辑编辑",
    "common.segment": "片段",
    "common.emptySegment": "[空白片段]",
    "common.recognizedSegments": "识别出 {count} 个语音片段",
    "common.saveModify": "保存修改",
    "common.searchText": "搜索文字内容...",
    "common.invertSelection": "反选",
    "common.exportMode": "导出方式",
    "common.mergeToOneVideo": "合并为一个视频",
    "common.exportSeparately": "每个片段单独导出",
    "error.noSegmentSelected": "请至少选择一个片段",
    "error.configureSpeechRecognition": "请配置语音识别参数",
    "msg.taskNotCompleteConfirmSegments": "任务未完成，需要手动确认剪辑片段"
}
```

- [ ] **步骤 2：创建 en-US.json**

```json
{
    "common.deSelectAll": "Deselect All",
    "common.preview": "Preview",
    "common.videoExport": "Video Export",
    "common.convertAudio": "Convert Audio",
    "common.speechRecognition": "Speech Recognition",
    "common.textEdit": "Text Edit",
    "common.editTextSegments": "Edit Text Segments",
    "common.include": "Include",
    "common.exclude": "Exclude",
    "common.segmentCount": "Selected {include} / {total} segments",
    "common.manualEditSegment": "Text Cut Video Edit",
    "common.segment": "Segment",
    "common.emptySegment": "[Empty Segment]",
    "common.recognizedSegments": "Recognized {count} speech segments",
    "common.saveModify": "Save Changes",
    "common.searchText": "Search text...",
    "common.invertSelection": "Invert Selection",
    "common.exportMode": "Export Mode",
    "common.mergeToOneVideo": "Merge into one video",
    "common.exportSeparately": "Export each segment separately",
    "error.noSegmentSelected": "Please select at least one segment",
    "error.configureSpeechRecognition": "Please configure speech recognition parameters",
    "msg.taskNotCompleteConfirmSegments": "Task incomplete, manual segment confirmation required"
}
```

- [ ] **步骤 3：在 `src/lang/index.ts` 中注册**

在文件顶部的 import 区域添加（参照其他工具的 import 模式）：

```typescript
import textCutVideoEnUS from "../pages/Apps/TextCutVideo/lang/en-US.json";
import textCutVideoZhCN from "../pages/Apps/TextCutVideo/lang/zh-CN.json";
```

在 `messageList` 的 en-US 对象的 messages 中添加 `...textCutVideoEnUS,`（放在 `...videoQuickCutEnUS,` 之后）。

在 `messageList` 的 zh-CN 对象的 messages 中添加 `...textCutVideoZhCN,`（放在 `...videoQuickCutZhCN,` 之后）。

- [ ] **步骤 4：Commit**

```bash
git add src/pages/Apps/TextCutVideo/lang/zh-CN.json src/pages/Apps/TextCutVideo/lang/en-US.json src/lang/index.ts
git commit -m "feat(TextCutVideo): add i18n files and register in global lang"
```

---

### 任务 10：创建工作流节点

**文件：**
- 创建：`src/pages/Apps/TextCutVideo/workflow/node.ts`
- 创建：`src/pages/Apps/TextCutVideo/workflow/TextCutVideoNode.vue`

- [ ] **步骤 1：创建 node.ts**

```typescript
import { defineAsyncComponent } from "vue";
import AppIcon from "~icons/mdi/text-box-search";
import { t } from "../../../../lang";
import {
    NodeFunctionCall,
    NodeRunController,
    NodeRunParam,
    NodeRunResult,
} from "../../../../module/Workflow/core/type";
import { workflowRun } from "../../common/workflow";
import { TextCutVideoRun } from "../task";

export default <NodeFunctionCall>{
    name: "TextCutVideo",
    title: "文本剪辑视频",
    description: "通过文字内容剪辑视频",
    icon: AppIcon,
    comp: defineAsyncComponent(() => import("./TextCutVideoNode.vue")),
    inputFields: [
        {
            type: "file",
            name: "Video",
            fileExtensions: ["mp4"],
        },
    ],
    outputFields: [
        {
            type: "file",
            name: "Video",
            fileExtensions: ["mp4"],
        },
    ],
    async run(
        controller: NodeRunController,
        param: NodeRunParam,
    ): Promise<NodeRunResult> {
        return workflowRun(
            controller,
            param,
            async () => {
                const soundAsr = param.node.properties?.data?.soundAsr;
                const taskRunData = {
                    taskId: param.runData?.["taskId"] || "",
                    video: param.runInputs["Video"],
                    title: param.node.properties?.title + "-" + param.node.id,
                    soundAsr: soundAsr,
                };
                if (!taskRunData.video) {
                    throw t("error.missingVideoFile");
                }
                if (!taskRunData.soundAsr) {
                    throw t("error.configureSpeechRecognition");
                }
                return await TextCutVideoRun(taskRunData);
            },
            async (result, data) => {
                result.runOutputs["Video"] = data.video;
            },
        );
    },
    async check(node) {
        if (!node.properties?.data?.soundAsr) {
            throw t("error.configureSpeechRecognition");
        }
        if (node.properties?.inputFields?.[0].value === "") {
            throw t("error.inputVideoParam");
        }
    },
};
```

- [ ] **步骤 2：创建 TextCutVideoNode.vue**

```vue
<script setup lang="ts">
import { ref } from "vue";
import TaskDialogViewButton from "../../../../components/common/TaskDialogViewButton.vue";
import {
    FunctionCallNodeEmits,
    FunctionCallNodeProps,
    useFunctionCallNode,
} from "../../../../module/Workflow/nodes/FunctionCall/lib";
import TextCutVideoParamDialog from "../components/TextCutVideoParamDialog.vue";
import TextCutVideoParamView from "../components/TextCutVideoParamView.vue";

const props = defineProps<FunctionCallNodeProps>();
const emit = defineEmits<FunctionCallNodeEmits>();
const { nodeData, nodeRunData, nodeUpdateData } = useFunctionCallNode(
    props,
    emit,
);
const paramDialog = ref<InstanceType<typeof TextCutVideoParamDialog>>();
</script>

<template>
    <div class="p-2 relative">
        <div>
            <TextCutVideoParamView v-if="nodeData.soundAsr" :data="nodeData" />
            <div class="flex gap-2 items-center">
                <a-button
                    v-if="props.source === 'config'"
                    @click="paramDialog?.show(nodeData)"
                    size="small"
                >
                    <template #icon>
                        <icon-settings />
                    </template>
                    {{ $t("common.setting2") }}
                </a-button>
                <TaskDialogViewButton :task-id="nodeRunData.taskId" />
            </div>
        </div>
    </div>
    <TextCutVideoParamDialog ref="paramDialog" @update="nodeUpdateData" />
</template>
```

- [ ] **步骤 3：Commit**

```bash
git add src/pages/Apps/TextCutVideo/workflow/node.ts src/pages/Apps/TextCutVideo/workflow/TextCutVideoNode.vue
git commit -m "feat(TextCutVideo): add workflow node"
```

---

### 任务 11：注册到 all.ts

**文件：**
- 修改：`src/pages/Apps/all.ts`

- [ ] **步骤 1：更新 all.ts 中的 TextCutVideo 条目**

在文件顶部添加 icon import：

```typescript
import TextCutVideoIcon from "~icons/mdi/text-box-search";
```

更新 `VideoApps` 数组中的 `TextCutVideo` 条目（已有占位条目指向 SubtitleTts，需要替换）：

```typescript
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
];
```

- [ ] **步骤 2：Commit**

```bash
git add src/pages/Apps/all.ts
git commit -m "feat(TextCutVideo): register in all.ts VideoApps"
```

---

### 任务 12：在 Item 组件中支持单独导出的多文件展示

**文件：**
- 修改：`src/pages/Apps/TextCutVideo/components/TextCutVideoItem.vue`

单独导出时 `Export.files` 有多个文件，但 `result.url` 只保存了第一个。需要在 Item 组件的 Export 步骤展示区域中，当 `jobResult.Edit.exportMode === "separate"` 时列出所有导出文件并提供下载链接。

- [ ] **步骤 1：在 TextCutVideoItem.vue 的 Export 步骤区域中添加多文件展示**

将 Export 步骤的展示区域改为：

```vue
<TaskJobResultStepView :record="record" step="Export">
    <div>
        <div v-if="record.jobResult?.Edit?.exportMode === 'separate'" class="space-y-1">
            <div v-for="(file, index) in record.jobResult?.Export?.files" :key="index" class="flex items-center gap-2">
                <VideoPreviewBox :url="file" />
                <a-button size="mini" @click="$mapi.file.openPath(file)">
                    <icon-download />
                </a-button>
                <span class="text-xs text-gray-500">{{ $t("common.segment") }} {{ index + 1 }}</span>
            </div>
        </div>
        <div v-else>
            <VideoPreviewBox :url="record.jobResult?.Export?.files?.[0]!" />
        </div>
    </div>
</TaskJobResultStepView>
```

- [ ] **步骤 2：Commit**

```bash
git add src/pages/Apps/TextCutVideo/components/TextCutVideoItem.vue
git commit -m "feat(TextCutVideo): support multi-file display for separate export mode"
```

---

### 任务 13：验证构建

- [ ] **步骤 1：运行 TypeScript 类型检查**

```bash
npx vue-tsc --noEmit
```

预期：无类型错误。如果有，修复并重新检查。

- [ ] **步骤 2：运行构建**

```bash
npm run build
```

预期：构建成功，无错误。

- [ ] **步骤 3：最终 Commit（如有修复）**

```bash
git add -A
git commit -m "fix(TextCutVideo): fix build errors"
```
