# LivePortrait AIGCPanel 模型包集成 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 LivePortrait 封装为 AIGCPanel 可识别的本地模型包，同时支持音频驱动和视频驱动两种口型同步模式。

**架构：** 使用 EasyServer 模式（`entry: "__EasyServer__"`），通过 launcher.py 将 AIGCPanel 的标准调用适配到 LivePortrait 的 inference.py。前端增加驱动方式选择（音频/视频），后端扩展 videoGen 数据传递以支持 drivingVideo 字段。

**技术栈：** Vue 3 + TypeScript（前端），Python（launcher），Electron（后端）

---

## 文件结构

### 新增文件（模型包 — 放置在独立的 LivePortrait 模型目录中）

| 文件 | 职责 |
|------|------|
| `model/LivePortrait/config.json` | AIGCPanel 模型注册配置，声明 videoGen 功能和参数 |
| `model/LivePortrait/launcher.py` | EasyServer 入口脚本，解析 AIGCPanel 传入的 config JSON，调用 LivePortrait 推理，通过 stdout 输出结果 |
| `model/LivePortrait/setup.sh` | Linux/macOS 环境安装脚本（conda + PyTorch + 依赖 + 权重下载） |
| `model/LivePortrait/setup.bat` | Windows 环境安装脚本 |

### 修改文件（AIGCPanel 源码 — 在 worktree 中操作）

| 文件 | 职责 | 变更说明 |
|------|------|----------|
| `src/pages/Video/components/VideoGenCreate.vue` | 数字人合成创建表单 | 增加 driveMode 选择和 drivingVideoFile 上传 |
| `src/task/VideoGen.ts` | VideoGen 任务执行逻辑 | 支持传递 drivingVideo 参数给 server |
| `src/declarations/app.d.ts` | TypeScript 类型声明 | 扩展 VideoGenModelConfigType 增加 driveMode 和 drivingVideoFile |
| `src/pages/Video/locales/zh-CN.json` | 中文翻译 | 新增驱动方式相关翻译键 |
| `src/pages/Video/locales/en-US.json` | 英文翻译 | 新增驱动方式相关翻译键 |
| `src/pages/Video/components/VideoGenFormViewBody.vue` | 任务历史展示组件 | 展示驱动模式标签 |

### 不修改的文件（说明）

以下文件在 EasyServer 模式下**不需要修改**，因为 launcher.py 负责了所有数据适配：

- `electron/aigcserver/EasyServer.ts` — videoGen 的 configCalculator 中 `data.audio` 字段对于视频驱动模式会传入视频文件路径，launcher.py 根据文件扩展名判断是音频还是视频，不需要新增字段。这样避免修改 Electron 层代码。
- `electron/mapi/httpserver/main.ts` — 同理，不需要新增字段。

### 不修改但需确认兼容性的文件

- `src/pages/Apps/VideoGenFlow/components/VideoGenFlowCreate.vue` — 这是"数字人一键合成"流程（文本→音频→视频），始终是音频驱动模式，不受本次变更影响。它使用 `VideoGenForm` 组件选择模型和形象，但不使用 `VideoGenCreate.vue`，因此不需要修改。

---

## 任务 1：创建 LivePortrait 模型包 config.json

**文件：**
- 创建：`model/LivePortrait/config.json`

- [ ] **步骤 1：创建 config.json**

在项目根目录下创建 `model/LivePortrait/` 目录和 `config.json` 文件：

```json
{
    "name": "LivePortrait",
    "title": "LivePortrait",
    "version": "1.0.0",
    "entry": "__EasyServer__",
    "description": "快手开源的高效人像动画模型，支持音频和视频驱动",
    "functions": ["videoGen"],
    "easyServer": {
        "entry": "python",
        "entryArgs": ["launcher.py", "${CONFIG}"],
        "envs": [],
        "content": "快手开源的高效人像动画模型，支持音频和视频驱动口型同步。基于 stitching 和 retargeting control 实现精准的人像动画。",
        "functions": {
            "videoGen": {
                "content": "LivePortrait 口型同步视频生成",
                "param": [
                    {
                        "name": "flag_stitching",
                        "type": "select",
                        "title": "拼接控制",
                        "default": true,
                        "options": [
                            { "value": true, "label": "开启（推荐）" },
                            { "value": false, "label": "关闭" }
                        ]
                    },
                    {
                        "name": "driving_multiplier",
                        "type": "slider",
                        "title": "驱动强度",
                        "default": 1.0,
                        "min": 0.5,
                        "max": 2.0,
                        "step": 0.1
                    },
                    {
                        "name": "flag_crop_driving_video",
                        "type": "select",
                        "title": "自动裁剪驱动视频",
                        "default": false,
                        "options": [
                            { "value": true, "label": "开启" },
                            { "value": false, "label": "关闭" }
                        ]
                    }
                ]
            }
        }
    }
}
```

- [ ] **步骤 2：验证 config.json 可被 AIGCPanel 解析**

确认 JSON 格式正确：`python -c "import json; json.load(open('model/LivePortrait/config.json'))"` 或手动检查。

- [ ] **步骤 3：Commit**

```bash
git add -f model/LivePortrait/config.json
git commit -m "feat(liveportrait): add model config.json for AIGCPanel integration"
```

---

## 任务 2：创建 launcher.py 入口脚本

**文件：**
- 创建：`model/LivePortrait/launcher.py`

这是核心适配层，负责：
1. 解析 AIGCPanel 传入的临时 config JSON
2. 根据文件扩展名判断驱动类型（音频/视频/pkl）
3. 构建并执行 LivePortrait inference.py 命令
4. 通过 stdout 输出 `AigcPanelRunResult[taskId][base64Data]` 返回结果

- [ ] **步骤 1：创建 launcher.py**

```python
import sys
import json
import base64
import os
import subprocess


def log(msg):
    sys.stderr.write(f"[LivePortrait] {msg}\n")
    sys.stderr.flush()


def output_result(task_id, data):
    encoded = base64.b64encode(json.dumps(data).encode()).decode()
    sys.stdout.write(f"AigcPanelRunResult[{task_id}][{encoded}]\n")
    sys.stdout.flush()


def find_latest_output(output_dir):
    files = [
        os.path.join(output_dir, f)
        for f in os.listdir(output_dir)
        if f.endswith(".mp4")
    ]
    if not files:
        return None
    return max(files, key=os.path.getmtime)


def main():
    if len(sys.argv) < 2:
        log("Usage: launcher.py <config_json_path>")
        sys.exit(1)

    config_path = sys.argv[1]
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    task_id = config["id"]
    model_config = config["modelConfig"]
    param = model_config.get("param", {})

    video_source = model_config["video"]
    driving_input = model_config["audio"]
    root_dir = os.environ.get("AIGCPANEL_SERVER_PLACEHOLDER_ROOT", ".")

    inference_script = os.path.join(root_dir, "inference.py")
    if not os.path.exists(inference_script):
        output_result(task_id, {"error": f"inference.py not found at {inference_script}"})
        output_result(task_id, {"End": True})
        sys.exit(1)

    output_dir = os.path.join(root_dir, "animations")
    os.makedirs(output_dir, exist_ok=True)

    for f in os.listdir(output_dir):
        if f.endswith(".mp4"):
            try:
                os.remove(os.path.join(output_dir, f))
            except OSError:
                pass

    cmd = [sys.executable, inference_script, "-s", video_source, "-d", driving_input]

    if param.get("flag_stitching") is False:
        cmd.append("--no_flag_stitching")

    driving_multiplier = param.get("driving_multiplier", 1.0)
    if driving_multiplier and float(driving_multiplier) != 1.0:
        cmd.extend(["--driving_multiplier", str(driving_multiplier)])

    if param.get("flag_crop_driving_video"):
        cmd.append("--flag_crop_driving_video")

    log(f"Running: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=root_dir,
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        output_result(task_id, {"error": "Inference timeout (600s)"})
        output_result(task_id, {"End": True})
        sys.exit(1)
    except Exception as e:
        output_result(task_id, {"error": str(e)})
        output_result(task_id, {"End": True})
        sys.exit(1)

    if result.returncode != 0:
        error_msg = result.stderr[-500:] if result.stderr else "Unknown error"
        log(f"Inference failed: {error_msg}")
        output_result(task_id, {"error": error_msg})
        output_result(task_id, {"End": True})
        sys.exit(1)

    output_file = find_latest_output(output_dir)

    if output_file and os.path.exists(output_file):
        log(f"Output: {output_file}")
        output_result(task_id, {"url": output_file})
        output_result(task_id, {"End": True})
    else:
        log("No output file found")
        output_result(task_id, {"error": "No output file generated"})
        output_result(task_id, {"End": True})


if __name__ == "__main__":
    main()
```

**关键设计决策**：
- `model_config["audio"]` 字段在 AIGCPanel 中传递音频文件路径，但 LivePortrait 的 `-d` 参数原生支持 `.wav` 音频和 `.mp4` 视频文件。launcher.py 不做类型判断，直接将 `audio` 字段的值传递给 `-d` 参数，LivePortrait 会根据文件扩展名自动处理。
- 对于视频驱动模式，前端 VideoGenCreate.vue 将视频文件路径存入 `modelConfig.drivingVideoFile`，VideoGen.ts 的 runFunc 将 `drivingVideoFile` 赋值给 `audioFile` 变量，最终通过 `data.audio` 传递给 EasyServer。launcher.py 统一从 `model_config["audio"]` 读取驱动源，无需关心是音频还是视频。

- [ ] **步骤 2：验证 launcher.py 语法**

运行：`python -c "import py_compile; py_compile.compile('model/LivePortrait/launcher.py', doraise=True)"`

- [ ] **步骤 3：Commit**

```bash
git add -f model/LivePortrait/launcher.py
git commit -m "feat(liveportrait): add launcher.py for EasyServer integration"
```

---

## 任务 3：创建环境安装脚本

**文件：**
- 创建：`model/LivePortrait/setup.sh`
- 创建：`model/LivePortrait/setup.bat`

- [ ] **步骤 1：创建 setup.sh（Linux/macOS）**

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== LivePortrait AIGCPanel Model Setup ==="

if ! command -v conda &> /dev/null; then
    echo "ERROR: conda not found. Please install Anaconda or Miniconda first."
    exit 1
fi

if [ ! -f "inference.py" ]; then
    echo "Cloning LivePortrait repository..."
    git clone https://github.com/KlingAIResearch/LivePortrait.git temp_clone
    cp -r temp_clone/* .
    cp -r temp_clone/.* . 2>/dev/null || true
    rm -rf temp_clone
fi

if ! conda env list | grep -q "LivePortrait"; then
    echo "Creating conda environment..."
    conda create -n LivePortrait python=3.10 -y
fi

eval "$(conda shell.bash hook)"
conda activate LivePortrait

CUDA_VERSION=$(nvcc -V 2>/dev/null | grep release | awk '{print $5}' | cut -d. -f1,2 || echo "unknown")
echo "Detected CUDA version: $CUDA_VERSION"

if [[ "$CUDA_VERSION" == "11.8" ]]; then
    pip install torch==2.3.0 torchvision==0.18.0 torchaudio==2.3.0 --index-url https://download.pytorch.org/whl/cu118
elif [[ "$CUDA_VERSION" == "12.1" ]]; then
    pip install torch==2.3.0 torchvision==0.18.0 torchaudio==2.3.0 --index-url https://download.pytorch.org/whl/cu121
else
    pip install torch torchvision torchaudio
fi

pip install -r requirements.txt

if [ ! -d "pretrained_weights" ] || [ -z "$(ls -A pretrained_weights 2>/dev/null)" ]; then
    echo "Downloading pretrained weights..."
    pip install -U "huggingface_hub[cli]"
    huggingface-cli download KlingTeam/LivePortrait --local-dir pretrained_weights --exclude "*.git*" "README.md" "docs"
fi

echo "=== Setup Complete ==="
```

- [ ] **步骤 2：创建 setup.bat（Windows）**

```batch
@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo === LivePortrait AIGCPanel Model Setup ===

where conda >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: conda not found. Please install Anaconda or Miniconda first.
    exit /b 1
)

if not exist "inference.py" (
    echo Cloning LivePortrait repository...
    git clone https://github.com/KlingAIResearch/LivePortrait.git temp_clone
    xcopy temp_clone\* . /e /y /q
    rmdir /s /q temp_clone
)

call conda activate LivePortrait 2>nul
if %errorlevel% neq 0 (
    echo Creating conda environment...
    call conda create -n LivePortrait python=3.10 -y
    call conda activate LivePortrait
)

nvcc -V >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('nvcc -V 2^>^&1 ^| findstr release') do (
        for /f "tokens=1,2 delims=." %%b in ("%%a") do (
            set CUDA_MAJOR=%%b
            set CUDA_MINOR=%%c
        )
    )
    echo Detected CUDA version: !CUDA_MAJOR!.!CUDA_MINOR!

    if "!CUDA_MAJOR!.!CUDA_MINOR!"=="11.8" (
        pip install torch==2.3.0 torchvision==0.18.0 torchaudio==2.3.0 --index-url https://download.pytorch.org/whl/cu118
    ) else if "!CUDA_MAJOR!.!CUDA_MINOR!"=="12.1" (
        pip install torch==2.3.0 torchvision==0.18.0 torchaudio==2.3.0 --index-url https://download.pytorch.org/whl/cu121
    ) else (
        pip install torch torchvision torchaudio
    )
) else (
    echo CUDA not detected, installing CPU PyTorch...
    pip install torch torchvision torchaudio
)

pip install -r requirements.txt

if not exist "pretrained_weights" (
    echo Downloading pretrained weights...
    pip install -U "huggingface_hub[cli]"
    huggingface-cli download KlingTeam/LivePortrait --local-dir pretrained_weights --exclude "*.git*" "README.md" "docs"
)

echo === Setup Complete ===
```

- [ ] **步骤 3：Commit**

```bash
git add -f model/LivePortrait/setup.sh model/LivePortrait/setup.bat
git commit -m "feat(liveportrait): add environment setup scripts"
```

---

## 任务 4：修改前端 — VideoGenCreate.vue 增加驱动方式选择

**文件：**
- 修改：`src/pages/Video/components/VideoGenCreate.vue`

**目标：** 在视频合成创建表单中增加"驱动方式"选择（音频驱动 / 视频驱动），视频驱动时显示上传入口。

- [ ] **步骤 1：修改 VideoGenCreate.vue — 增加 formData 字段**

在 `<script setup>` 中，将 formData 从：

```typescript
const formData = ref({
    soundType: "soundGenerate",
    soundGenerateId: 0,
    soundCustomFile: "",
});
```

改为：

```typescript
const formData = ref({
    soundType: "soundGenerate",
    soundGenerateId: 0,
    soundCustomFile: "",
    driveMode: "audio",
    drivingVideoFile: "",
});
```

- [ ] **步骤 2：修改 VideoGenCreate.vue — 恢复存储数据**

在 `onMounted` 中，将恢复逻辑从：

```typescript
onMounted(() => {
    const old = StorageUtil.getObject("VideoGenCreate.formData");
    formData.value.soundType = old.soundType || "soundGenerate";
    formData.value.soundGenerateId = old.soundGenerateId || 0;
    formData.value.soundCustomFile = old.soundCustomFile || "";
});
```

改为：

```typescript
onMounted(() => {
    const old = StorageUtil.getObject("VideoGenCreate.formData");
    formData.value.soundType = old.soundType || "soundGenerate";
    formData.value.soundGenerateId = old.soundGenerateId || 0;
    formData.value.soundCustomFile = old.soundCustomFile || "";
    formData.value.driveMode = old.driveMode || "audio";
    formData.value.drivingVideoFile = old.drivingVideoFile || "";
});
```

- [ ] **步骤 3：修改 VideoGenCreate.vue — doSubmit 方法支持视频驱动**

在 `doSubmit` 中，将 modelConfig 构建和验证逻辑修改为同时支持两种模式。替换整个 `doSubmit` 函数：

```typescript
const doSubmit = async () => {
    const videoGenValue = await videoGenForm.value?.getValue();
    if (!videoGenValue) {
        return;
    }

    const isVideoDrive = formData.value.driveMode === "video";

    if (isVideoDrive) {
        if (!formData.value.drivingVideoFile) {
            Dialog.tipError(t("hint.selectDrivingVideo"));
            return;
        }
    }

    let soundRecord: TaskRecord | null = null;
    let soundCustomFile: string | null = null;
    if (!isVideoDrive) {
        if (formData.value.soundType === "soundGenerate") {
            if (!formData.value.soundGenerateId) {
                Dialog.tipError(t("hint.selectVoice"));
                return;
            }
            soundRecord = await TaskService.get(
                formData.value.soundGenerateId,
            );
            if (!soundRecord) {
                Dialog.tipError(t("hint.selectVoice"));
                return;
            }
        } else if (formData.value.soundType === "soundCustom") {
            soundCustomFile = formData.value.soundCustomFile;
            if (!soundCustomFile) {
                Dialog.tipError(t("hint.selectVoice"));
                return;
            }
        } else {
            Dialog.tipError("unknown soundType");
            return;
        }
    }

    const modelConfig: any = {
        videoTemplateId: videoGenValue.videoTemplateId,
        videoTemplateName: videoGenValue.videoTemplateName,
        videoTemplateUrl: videoGenValue.videoTemplateUrl,
        driveMode: formData.value.driveMode,
    };

    if (isVideoDrive) {
        modelConfig.soundType = "soundCustom";
        modelConfig.soundCustomFile = "";
        modelConfig.drivingVideoFile = formData.value.drivingVideoFile;
    } else {
        modelConfig.soundType = formData.value.soundType;
        modelConfig.soundGenerateId = formData.value.soundGenerateId as number;
        modelConfig.soundGenerateText = soundRecord
            ? soundRecord.modelConfig.text
            : "";
        modelConfig.soundCustomFile = soundCustomFile || "";
    }

    const record: TaskRecord = {
        biz: "VideoGen",
        title: await window.$mapi.file.textToName(
            videoGenValue.videoTemplateName + "_" + TimeUtil.datetimeString(),
        ),
        serverName: videoGenValue.serverName,
        serverTitle: videoGenValue.serverTitle,
        serverVersion: videoGenValue.serverVersion,
        modelConfig,
        param: videoGenValue.param,
    };
    if (!(await PermissionService.checkForTask("VideoGen", record))) {
        return;
    }
    const id = await TaskService.submit(record);
    Dialog.tipSuccess(t("task.videoGenSubmitted"));
    emit("submitted");
    return id;
};
```

- [ ] **步骤 4：修改 VideoGenCreate.vue — 增加 doDrivingVideoSelect 方法**

在 `doSoundCustomSelect` 方法后面添加：

```typescript
const doDrivingVideoSelect = async () => {
    const path = await window.$mapi.file.openFile({
        filters: [
            { name: "*.mp4", extensions: ["mp4"] },
            { name: "*.avi", extensions: ["avi"] },
            { name: "*.mov", extensions: ["mov"] },
            { name: "*.pkl", extensions: ["pkl"] },
        ],
    });
    if (!path) {
        return;
    }
    formData.value.drivingVideoFile = path;
};
```

- [ ] **步骤 5：修改 VideoGenCreate.vue — 模板增加驱动方式 UI**

在 `<template>` 中，将"声音配置"区域替换为支持驱动方式选择的新布局。找到以下部分：

```html
        <div class="font-bold mb-2">
            <icon-settings />
            {{ $t("voice.config") }}
        </div>
        <div class="flex items-center flex-wrap gap-2">
            <div class="flex items-center gap-1 flex-shrink-0">
                <i-mdi-volume-high class="w-4 h-4" />
                <span>{{ $t("voice.voice") }}</span>
            </div>
            <a-radio-group v-model="formData.soundType" class="flex-shrink-0">
                <a-radio value="soundGenerate">
                    <i-mdi-text-to-speech
                        class="w-4 h-4 inline-block align-middle"
                    />
                    {{ $t("voice.synthesis") }}
                </a-radio>
                <a-radio value="soundCustom">
                    <icon-file />
                    {{ $t("common.localFile") }}
                </a-radio>
            </a-radio-group>
            <div
                class="flex-shrink-0 min-w-64"
                v-if="formData.soundType === 'soundGenerate'"
            >
                <SoundGenerateSelector v-model="formData.soundGenerateId" />
            </div>
            <div
                class="flex-shrink-0"
                v-if="formData.soundType === 'soundCustom'"
            >
                <a-button @click="doSoundCustomSelect">
                    <div v-if="formData.soundCustomFile">
                        {{ fileName(formData.soundCustomFile) }}
                    </div>
                    <div v-else>{{ $t("common.selectLocalFile") }}</div>
                </a-button>
            </div>
        </div>
```

替换为：

```html
        <div class="font-bold mb-2">
            <icon-settings />
            {{ $t("voice.config") }}
        </div>
        <div class="flex items-center flex-wrap gap-2 mb-2">
            <div class="flex items-center gap-1 flex-shrink-0">
                <i-mdi-steering class="w-4 h-4" />
                <span>{{ $t("avatar.driveMode") }}</span>
            </div>
            <a-radio-group v-model="formData.driveMode" class="flex-shrink-0">
                <a-radio value="audio">{{ $t("avatar.audioDrive") }}</a-radio>
                <a-radio value="video">{{ $t("avatar.videoDrive") }}</a-radio>
            </a-radio-group>
        </div>
        <div
            class="flex items-center flex-wrap gap-2"
            v-if="formData.driveMode === 'audio'"
        >
            <div class="flex items-center gap-1 flex-shrink-0">
                <i-mdi-volume-high class="w-4 h-4" />
                <span>{{ $t("voice.voice") }}</span>
            </div>
            <a-radio-group v-model="formData.soundType" class="flex-shrink-0">
                <a-radio value="soundGenerate">
                    <i-mdi-text-to-speech
                        class="w-4 h-4 inline-block align-middle"
                    />
                    {{ $t("voice.synthesis") }}
                </a-radio>
                <a-radio value="soundCustom">
                    <icon-file />
                    {{ $t("common.localFile") }}
                </a-radio>
            </a-radio-group>
            <div
                class="flex-shrink-0 min-w-64"
                v-if="formData.soundType === 'soundGenerate'"
            >
                <SoundGenerateSelector v-model="formData.soundGenerateId" />
            </div>
            <div
                class="flex-shrink-0"
                v-if="formData.soundType === 'soundCustom'"
            >
                <a-button @click="doSoundCustomSelect">
                    <div v-if="formData.soundCustomFile">
                        {{ fileName(formData.soundCustomFile) }}
                    </div>
                    <div v-else>{{ $t("common.selectLocalFile") }}</div>
                </a-button>
            </div>
        </div>
        <div
            class="flex items-center flex-wrap gap-2"
            v-if="formData.driveMode === 'video'"
        >
            <div class="flex items-center gap-1 flex-shrink-0">
                <i-mdi-video-box class="w-4 h-4" />
                <span>{{ $t("avatar.selectDrivingVideo") }}</span>
            </div>
            <a-button @click="doDrivingVideoSelect">
                <div v-if="formData.drivingVideoFile">
                    {{ fileName(formData.drivingVideoFile) }}
                </div>
                <div v-else>{{ $t("hint.selectDrivingVideo") }}</div>
            </a-button>
        </div>
```

- [ ] **步骤 6：Commit**

```bash
git add src/pages/Video/components/VideoGenCreate.vue
git commit -m "feat(liveportrait): add drive mode selection (audio/video) to VideoGenCreate"
```

---

## 任务 5：修改 VideoGenModelConfigType 类型声明

**文件：**
- 修改：`src/declarations/app.d.ts`

**目标：** 扩展 `VideoGenModelConfigType` 类型，添加 `driveMode` 和 `drivingVideoFile` 字段，否则 VideoGen.ts 中访问这些字段会产生 TypeScript 编译错误。

- [ ] **步骤 1：修改 VideoGenModelConfigType 类型定义**

找到 `app.d.ts` 中的 `VideoGenModelConfigType` 定义：

```typescript
declare type VideoGenModelConfigType = {
    videoTemplateId: number;
    videoTemplateName: string;
    videoTemplateUrl: string;
    soundType: "soundGenerate" | "soundCustom";
    soundGenerateId: number;
    soundGenerateText: string;
    soundCustomFile: string;
};
```

替换为：

```typescript
declare type VideoGenModelConfigType = {
    videoTemplateId: number;
    videoTemplateName: string;
    videoTemplateUrl: string;
    soundType: "soundGenerate" | "soundCustom";
    soundGenerateId: number;
    soundGenerateText: string;
    soundCustomFile: string;
    driveMode?: "audio" | "video";
    drivingVideoFile?: string;
};
```

`driveMode` 和 `drivingVideoFile` 标记为可选（`?`），因为旧的任务记录不包含这些字段。

- [ ] **步骤 2：Commit**

```bash
git add src/declarations/app.d.ts
git commit -m "feat(liveportrait): extend VideoGenModelConfigType with drive mode fields"
```

---

## 任务 6：修改 VideoGen.ts 任务执行逻辑

**文件：**
- 修改：`src/task/VideoGen.ts`

**目标：** 让 VideoGen 任务在视频驱动模式下，将 drivingVideoFile 作为 audio 字段传递给 server（因为 launcher.py 统一通过 audio 字段接收驱动源）。

- [ ] **步骤 1：修改 runFunc 中的音频获取和 server 调用逻辑**

将 `runFunc` 方法中从 `let audioFile: string | null = null;` 到 `audio: audioFile,` 之间的代码替换。

找到以下代码块：

```typescript
        let audioFile: string | null = null;
        if (modelConfig.soundType === "soundGenerate") {
            const soundRecord = await TaskService.get(
                modelConfig.soundGenerateId,
            );
            audioFile = soundRecord?.result.url as string;
        } else if (modelConfig.soundType === "soundCustom") {
            audioFile = modelConfig.soundCustomFile;
        }
        if (!audioFile) {
            throw new Error("AudioFileEmpty");
        }
        const res = await serverStore.call(serverInfo, "videoGen", {
            id: serverStore.generateTaskId("VideoGen", bizId),
            result: record.result,
            param: record.param,
            video: modelConfig.videoTemplateUrl,
            audio: audioFile,
        });
```

替换为：

```typescript
        let audioFile: string | null = null;
        const isVideoDrive = modelConfig.driveMode === "video";
        if (isVideoDrive) {
            audioFile = modelConfig.drivingVideoFile;
        } else if (modelConfig.soundType === "soundGenerate") {
            const soundRecord = await TaskService.get(
                modelConfig.soundGenerateId,
            );
            audioFile = soundRecord?.result.url as string;
        } else if (modelConfig.soundType === "soundCustom") {
            audioFile = modelConfig.soundCustomFile;
        }
        if (!audioFile) {
            throw new Error("AudioFileEmpty");
        }
        const res = await serverStore.call(serverInfo, "videoGen", {
            id: serverStore.generateTaskId("VideoGen", bizId),
            result: record.result,
            param: record.param,
            video: modelConfig.videoTemplateUrl,
            audio: audioFile,
        });
```

**设计说明**：视频驱动模式下，`drivingVideoFile` 的值通过 `audio` 字段传递给 server。launcher.py 会将 `model_config["audio"]` 的值传给 LivePortrait 的 `-d` 参数。LivePortrait 根据 `-d` 参数的文件扩展名自动判断是音频还是视频。

- [ ] **步骤 2：Commit**

```bash
git add src/task/VideoGen.ts
git commit -m "feat(liveportrait): support video drive mode in VideoGen task"
```

---

## 任务 7：更新国际化翻译文件

**文件：**
- 修改：`src/pages/Video/locales/zh-CN.json`
- 修改：`src/pages/Video/locales/en-US.json`

- [ ] **步骤 1：修改 zh-CN.json**

在 JSON 中添加以下键（在 `"video.providerName"` 行之后）：

```json
    "avatar.driveMode": "驱动方式",
    "avatar.audioDrive": "音频驱动",
    "avatar.videoDrive": "视频驱动",
    "avatar.selectDrivingVideo": "驱动视频",
    "hint.selectDrivingVideo": "请选择驱动视频",
```

- [ ] **步骤 2：修改 en-US.json**

在 JSON 中添加以下键（在 `"video.providerName"` 行之后）：

```json
    "avatar.driveMode": "Drive Mode",
    "avatar.audioDrive": "Audio Drive",
    "avatar.videoDrive": "Video Drive",
    "avatar.selectDrivingVideo": "Driving Video",
    "hint.selectDrivingVideo": "Please select a driving video",
```

- [ ] **步骤 3：Commit**

```bash
git add src/pages/Video/locales/zh-CN.json src/pages/Video/locales/en-US.json
git commit -m "feat(liveportrait): add i18n keys for drive mode selection"
```

---

## 任务 8：更新 VideoGenFormViewBody 展示驱动模式

**文件：**
- 修改：`src/pages/Video/components/VideoGenFormViewBody.vue`

**目标：** 在任务历史列表中展示驱动模式信息（视频驱动时显示驱动视频标签）。

- [ ] **步骤 1：修改 VideoGenFormViewBody.vue 模板**

将模板从：

```html
<template>
    <ServerNameVersion v-if="data.serverTitle" :record="data" />
    <a-tag v-if="data.videoTemplateName" class="rounded-lg">
        <i-mdi-video-box class="w-5 h-5" />
        {{ data.videoTemplateName }}
    </a-tag>
    <ParamFormView v-if="data.param" :param="data.param" />
</template>
```

改为：

```html
<template>
    <ServerNameVersion v-if="data.serverTitle" :record="data" />
    <a-tag v-if="data.videoTemplateName" class="rounded-lg">
        <i-mdi-video-box class="w-5 h-5" />
        {{ data.videoTemplateName }}
    </a-tag>
    <a-tag v-if="data.driveMode === 'video'" class="rounded-lg" color="green">
        <i-mdi-movie-open class="w-5 h-5" />
        {{ $t("avatar.videoDrive") }}
    </a-tag>
    <ParamFormView v-if="data.param" :param="data.param" />
</template>
```

- [ ] **步骤 2：Commit**

```bash
git add src/pages/Video/components/VideoGenFormViewBody.vue
git commit -m "feat(liveportrait): show drive mode tag in task history"
```

---

## 任务 9：构建验证

- [ ] **步骤 1：运行 lint/typecheck**

运行项目的 lint 或 typecheck 命令，确保没有类型错误。

```bash
npm run typecheck
```

如果 typecheck 命令不存在，尝试：

```bash
npm run lint
```

- [ ] **步骤 2：修复任何错误**

如果出现类型错误，逐一修复。常见问题：
- `VideoGenModelConfigType` 类型可能不包含 `driveMode` 和 `drivingVideoFile` 字段，需要扩展类型定义。
- 查找 `VideoGenModelConfigType` 的定义位置并添加新字段。

- [ ] **步骤 3：最终 Commit**

```bash
git add -A
git commit -m "fix(liveportrait): fix typecheck errors for drive mode support"
```

---

## 自检清单

### 规格覆盖度

| 规格需求 | 对应任务 |
|----------|----------|
| 创建 config.json | 任务 1 |
| 创建 launcher.py | 任务 2 |
| 创建 setup.sh / setup.bat | 任务 3 |
| 前端增加驱动方式选择 | 任务 4 |
| 扩展类型声明 | 任务 5 |
| 后端支持 drivingVideo 参数 | 任务 6（通过 audio 字段传递） |
| 国际化翻译 | 任务 7 |
| 任务历史展示驱动模式 | 任务 8 |
| 构建验证 | 任务 9 |

### 占位符扫描

- 无 "TODO"、"待定" 等
- 所有步骤包含实际代码

### 类型一致性

- `formData.driveMode` 类型为 `"audio" | "video"`，在 VideoGenCreate.vue 和 VideoGen.ts 中一致使用
- `formData.drivingVideoFile` 类型为 `string`，通过 `modelConfig.drivingVideoFile` 传递到 VideoGen.ts
- `VideoGenModelConfigType` 在任务 5 中扩展了 `driveMode?` 和 `drivingVideoFile?` 可选字段，VideoGen.ts 中通过 `modelConfig.driveMode` 和 `modelConfig.drivingVideoFile` 访问，类型安全
