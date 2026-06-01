# TextCutVideo 文本剪辑视频 — 设计规格

## 概述

新建独立小工具 `TextCutVideo`（文本剪辑视频），通过语音识别提取视频中的文字内容，支持文字搜索、时间定位、勾选/反选，并将选中的文字对应视频片段剪辑导出。

以 VideoQuickCut 为蓝本，复用其步骤式任务流架构（TaskService + TaskBiz + jobResult 状态机），重新设计编辑界面的交互。

## 架构

### 任务步骤流

```
ToAudio → Asr → Edit → Export → End
```

| 步骤 | 说明 | 自动/手动 |
|------|------|-----------|
| ToAudio | 视频转音频，获取视频信息 | 自动 |
| Asr | 调用 ASR 服务进行语音识别 | 自动 |
| Edit | 暂停任务，弹出编辑界面供用户确认 | 手动（暂停等待） |
| Export | 根据用户选择导出视频 | 自动 |
| End | 完成 | - |

### 数据类型

```typescript
type TextCutVideoSegment = {
    start: number;       // 开始时间（毫秒）
    end: number;         // 结束时间（毫秒）
    text: string;        // 识别的文字内容
    include: boolean;    // 是否选中包含在最终视频中
};

type TextCutVideoModelConfigType = {
    video: string;
    soundAsr: SoundAsrParamType;
};

type TextCutVideoJobResultType = {
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

### 文件结构

```
src/pages/Apps/TextCutVideo/
├── TextCutVideo.vue
├── type.ts
├── task.ts
├── util.ts
├── components/
│   ├── TextCutVideoCreate.vue
│   ├── TextCutVideoItem.vue
│   ├── TextCutVideoParamForm.vue
│   ├── TextCutVideoParamDialog.vue
│   ├── TextCutVideoParamView.vue
│   └── TextCutVideoEditDialog.vue
├── workflow/
│   ├── TextCutVideoNode.vue
│   └── node.ts
└── lang/
    ├── en-US.json
    └── zh-CN.json
```

## 核心交互：编辑界面（TextCutVideoEditDialog）

### 布局

左右分栏，`a-modal` 宽度 `95vw`：

- 左侧（`w-1/2`）：视频播放器（`<video>` 标签，带 controls）
- 右侧（`w-1/2`）：
  - 搜索输入框（实时过滤文字列表）
  - 操作按钮栏：全选 / 反选 / 取消全选
  - 统计信息：已选 N/M 条
  - 文字列表（可滚动，最大高度 overflow-y-auto）
  - 导出方式选择：合并为一个视频 / 每个片段单独导出

### 文字列表每行结构

```
☑  [00:01.200 - 00:03.500]   大家好，欢迎来到...
```

- checkbox：视觉指示当前勾选状态
- 时间戳区域（点击 → 跳转到视频对应时间点并播放）
- 文字内容区域（点击 → 切换该行的 include 勾选状态）
- 当前播放位置对应的行自动高亮（蓝色背景）并滚动到可见区域

### 搜索

输入关键词实时过滤文字列表。匹配的文字高亮显示，不匹配的行半透明但仍可见，确保用户能看到上下文。

### 勾选操作

- 点击文字内容区域：切换该行勾选状态
- 全选按钮：所有行 include = true
- 取消全选按钮：所有行 include = false
- 反选按钮：所有行 include 状态翻转

### 视频播放联动

- 视频播放时通过 `timeupdate` 事件追踪当前时间
- 当前时间落在某个片段范围内时，该行自动高亮并滚动到可见区域
- 仅播放选中片段模式（可选 checkbox）：跳过未选中的片段

### 保存

用户确认后：
1. 将 `Edit.records` 和 `Edit.exportMode` 写入 jobResult
2. 设置 `jobResult.step = "Export"`
3. 更新任务状态为 `queue`，触发继续执行

## 导出逻辑（util.ts）

### 合并导出（exportMode = "merge"）

复用 VideoQuickCut 的 FFmpeg concat filter 方案：
- 筛选 `include=true` 的片段
- 使用 `filter_complex` 的 `trim + concat` 合并
- 输出单个 mp4 文件
- `Export.files` 为单元素数组

### 单独导出（exportMode = "separate"）

对每个 `include=true` 的片段单独截取：
- 使用 `ffmpeg -ss start -to end -c copy` 直接拷贝流（无需重编码）
- 每个文件命名 `原文件名_片段序号.mp4`
- `Export.files` 为多元素数组

## 注册

### all.ts

更新 `VideoApps` 数组中的 `TextCutVideo` 条目，指向新组件：

```typescript
{
    name: "TextCutVideo",
    title: t("task.textCutVideo"),
    description: "通过语音识别提取视频文字内容，支持搜索定位、勾选剪辑",
    icon: TextCutVideoIcon,
    color: "#8b5cf6",
    component: defineAsyncComponent(() => import("./TextCutVideo/TextCutVideo.vue")),
}
```

### TaskStore

注册 `"TextCutVideo"` 的 TaskBiz，与其他工具一致。

## 工作流节点

- 输入：一个视频文件（mp4）
- 输出：导出的视频文件（mp4）
- 配置：SoundAsr 参数（复用 SoundAsrForm）
- 逻辑与 VideoQuickCut 的 node.ts 对称

## 关键决策记录

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 与 VideoQuickCut 关系 | 新建独立工具 | 用户明确要求 |
| ASR 集成方式 | 复用 ServerSelector + serverSoundAsr | 与项目架构一致 |
| 编辑界面布局 | 左视频播放器，右搜索+文字列表 | 用户指定 |
| 点击时间戳 | 跳转播放 | 时间戳有定位语义 |
| 点击文字内容 | 切换勾选 | 文字区域大，操作方便 |
| 反选 | 支持 | 用户明确要求 |
| 导出方式 | 合并 + 单独导出均支持 | 用户明确要求 |
| 架构模式 | 步骤式任务流 | 复用项目已验证的架构 |
