---
name: aigcpanel-skills
description: 通过 AigcPanel Pro 内置 HTTP 接口或命令行 CLI 工具调用本地 AI 模型和任务处理能力。当需要列出可用模型、调用模型生成内容、查询任务结果、或批量处理视频/音频/图片时使用本技能。适用场景：自动化脚本调用 AI 模型、外部程序集成 AigcPanel Pro、批量处理任务、CLI 命令行调用。
---

# AigcPanel Pro 集成指南

AigcPanel Pro 提供两种集成方式：**HTTP 接口**（适合外部程序集成）和 **CLI 命令行工具**（适合脚本和终端操作）。

---

## 一、CLI 命令行工具

CLI 工具 `aigcpanel` 提供简洁的命令行接口，适合在脚本和终端中使用。

### 安装

打开应用 **设置 → CLI 工具**，点击"安装到系统"，即可在终端使用 `aigcpanel` 命令。

### 命令概览

| 命令 | 说明 |
|------|------|
| `aigcpanel version` | 查看版本信息 |
| `aigcpanel model_list` | 列出所有已安装 AI 模型 |
| `aigcpanel task --biz <类型> [参数...]` | 提交任务并等待结果 |

### 列出模型

```bash
aigcpanel model_list
```

输出示例：
```json
{
  "code": 0,
  "data": [
    { "name": "server-openai", "title": "OpenAI", "version": "1.0.0", "functions": [...] }
  ]
}
```

### 提交任务

```bash
# 语音合成
aigcpanel task --biz SoundGenerate --text "你好世界"

# 数字人合成（视频生成）
aigcpanel task --biz VideoGen --text "欢迎使用"

# 一键合成（视频生成流）
aigcpanel task --biz VideoGenFlow --text "欢迎使用"

# 语音识别
aigcpanel task --biz SoundAsr --file /path/to/audio.wav

# 声音替换
aigcpanel task --biz SoundReplace --file /path/to/video.mp4

# 长文本转音频
aigcpanel task --biz LongTextTts --text "这是一段较长的文本内容"

# 字幕转音频
aigcpanel task --biz SubtitleTts --file /path/to/subtitle.srt

# 文生图
aigcpanel task --biz TextToImage --prompt "美丽的山水风景"

# 图生图
aigcpanel task --biz ImageToImage --file /path/to/image.png --prompt "油画风格"

# 声音归一化
aigcpanel task --biz AudioNormal --file /path/to/audio.wav

# 视频压缩
aigcpanel task --biz VideoCompress --file /path/to/video.mp4

# 视频尺寸转换
aigcpanel task --biz VideoSizeConvert --file /path/to/video.mp4 --targetWidth 1280 --targetHeight 720

# 视频变速（全局）
aigcpanel task --biz VideoSpeed --file /path/to/video.mp4 --speed 1.5

# 视频片段变速
aigcpanel task --biz VideoSpeedPart --file /path/to/video.mp4

# 视频背景替换
aigcpanel task --biz VideoBackground --file /path/to/video.mp4 --image /path/to/bg.png

# 视频合并
aigcpanel task --biz VideoMerge --file /path/to/video1.mp4 --file2 /path/to/video2.mp4

# 视频添加音频
aigcpanel task --biz VideoMergeAudio --file /path/to/video.mp4 --audio /path/to/audio.wav

# 片头片尾图片
aigcpanel task --biz VideoMergeImage --file /path/to/video.mp4 --image /path/to/image.png

# 视频添加字幕
aigcpanel task --biz VideoSubtitle --file /path/to/video.mp4 --subtitle /path/to/subtitle.srt

# 视频标注
aigcpanel task --biz VideoMark --file /path/to/video.mp4

# 视频片段删除/保留
aigcpanel task --biz VideoKeepPart --file /path/to/video.mp4

# 视频片段放大
aigcpanel task --biz VideoZoom --file /path/to/video.mp4

# 智能剪辑
aigcpanel task --biz VideoQuickCut --file /path/to/video.mp4

# 媒体格式转换
aigcpanel task --biz MediaFormatConvert --file /path/to/video.mp4 --targetFormat mp4

# Ffmpeg 自定义处理
aigcpanel task --biz Ffmpeg --file1 /path/to/input.mp4
```

### 复杂参数（JSON 文件）

对于数组/对象类型的参数，用 `--参数名-json /path/to/file.json` 传入：

```bash
# VideoZoom 指定放大区域
echo '[{"start":1.0,"end":3.0,"x":0.2,"y":0.1,"width":0.6,"height":0.8}]' > /tmp/times.json
aigcpanel task --biz VideoZoom --file /path/to/video.mp4 --times-json /tmp/times.json
```

### 继续暂停的任务

部分任务（如 VideoZoom、VideoMark）需要确认才能继续执行：

```bash
# 第一步：提交任务（返回 taskId 和 pauseStage）
aigcpanel task --biz VideoZoom --file /path/to/video.mp4

# 第二步：确认继续（Config 阶段）
aigcpanel task --biz VideoZoom --task-id <taskId> --stage Config --times-json /tmp/times.json

# 第三步：渲染确认（RenderConfirm 阶段，如有）
aigcpanel task --biz VideoZoom --task-id <taskId> --stage RenderConfirm
```

### 输出结果

任务成功时输出包含 `result` 字段，通常有 `url`（输出文件路径）：

```json
{
  "code": 0,
  "data": {
    "status": "success",
    "result": { "url": "/path/to/output.mp4" }
  }
}
```

---

## 二、HTTP 接口

AigcPanel Pro 内置 HTTP 接口服务，默认监听 `http://localhost:59999`，提供模型列表、模型调用和结果查询能力。

### 前提条件

确认服务已启动：打开应用 **设置 → HTTP 接口**，确认状态为"运行中"。若未启动，点击"启动服务"按钮，或开启"自动启动"后重启应用。

### 获取可用模型

```
GET http://localhost:59999/api/model/list
```

响应示例：
```json
{
  "code": 0,
  "data": [
    { "id": "openai|gpt-4o", "providerId": "openai", "modelId": "gpt-4o", "modelName": "GPT-4o" },
    { "id": "deepseek|deepseek-chat", "providerId": "deepseek", "modelId": "deepseek-chat", "modelName": "DeepSeek Chat" }
  ]
}
```

`id` 格式为 `providerId|modelId`，调用时需传此值。

### 调用模型

```
POST http://localhost:59999/api/model/call
Content-Type: application/json

{ "model": "deepseek|deepseek-chat", "prompt": "用一句话介绍自己", "systemPrompt": "你是助手" }
```

- `model`（必填）：模型 ID，来自列表接口的 `id` 字段
- `prompt`（必填）：用户输入
- `systemPrompt`（可选）：系统提示词

响应：
```json
{ "code": 0, "data": { "taskId": "m3x7k2abc" } }
```

### 查询任务结果

```
GET http://localhost:59999/api/model/query?taskId=m3x7k2abc
```

响应（进行中）：`{ "code": 0, "data": { "status": "pending" } }`

响应（成功）：`{ "code": 0, "data": { "status": "success", "result": "..." } }`

响应（失败）：`{ "code": 0, "data": { "status": "error", "error": "..." } }`

`status` 为 `pending` 时继续轮询，建议间隔 500ms。

### 标准调用流程

1. 调用 `/api/model/list` 获取可用模型列表，选取目标模型 `id`
2. 调用 `/api/model/call` 传入 `model` 和 `prompt`，获得 `taskId`
3. 轮询 `/api/model/query?taskId=xxx` 直至 `status` 不为 `pending`
4. 读取 `result`（成功）或 `error`（失败）

## 错误处理

所有接口错误时返回 `{ "code": -1, "msg": "错误描述" }`，`code` 非 0 时视为失败。
常见原因：服务未启动、模型未在设置中启用、API Key 未配置。
