# LivePortrait AIGCPanel 模型包集成设计

## 概述

将快手开源的 LivePortrait 人像动画模型封装为 AIGCPanel 支持的本地模型，使用户可以在 AIGCPanel 的数字人合成界面直接选择 LivePortrait 作为口型同步模型。同时支持音频驱动和视频驱动两种模式。

## 背景

### LivePortrait 核心能力

LivePortrait 是快手开源的高效人像动画方案，核心功能是：给定一张源图像/视频 + 一个驱动视频/动作模板，生成精准口型同步的动画视频。

- GitHub: https://github.com/KlingAIResearch/LivePortrait
- 推理命令: `python inference.py -s <source> -d <driving>`
- 需要 PyTorch 环境和约 1GB 预训练权重

### AIGCPanel 模型体系

AIGCPanel 通过 `config.json` 注册本地模型，使用 EasyServer 模式管理模型生命周期：

1. 模型目录下放置 `config.json`，其中 `entry: "__EasyServer__"` 表示使用 EasyServer 模式
2. EasyServer 通过 `launcher` 命令启动 Python 进程
3. Python 进程从 stdout 输出 `AigcPanelRunResult[taskId][base64Data]` 返回结果
4. videoGen 函数需要返回 `{ url: "output_video_path" }`

### 现有模型

AIGCPanel 已支持的口型同步模型：MuseTalk、LatentSync、Wav2Lip、Heygem。

## 设计目标

1. 创建符合 AIGCPanel 模型规范的 LivePortrait 模型包
2. 支持音频驱动（与现有模型一致的体验）
3. 支持视频驱动（LivePortrait 原生模式，需修改前端）
4. 提供环境安装和权重下载的自动化脚本

## 交付物

### 1. 模型包文件

模型包目录结构：

```
model/LivePortrait/
├── config.json              # AIGCPanel 模型注册配置
├── launcher.py              # EasyServer 入口脚本
├── setup.sh                 # Linux/macOS 环境安装脚本
├── setup.bat                # Windows 环境安装脚本
├── install_weights.py       # 预训练权重下载脚本
└── README.md                # 使用说明
```

用户需要将此目录放置到 AIGCPanel 的模型数据目录中，并确保 LivePortrait 源码和预训练权重就位。

#### config.json

```json
{
  "name": "LivePortrait",
  "title": "LivePortrait",
  "version": "1.0.0",
  "entry": "__EasyServer__",
  "functions": ["videoGen"],
  "easyServer": {
    "entry": "launcher",
    "entryArgs": ["${CONFIG}"],
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

#### launcher.py 核心逻辑

```python
import sys
import json
import base64
import os
import subprocess

def main():
    # 1. 读取 AIGCPanel 传入的临时 config JSON 文件路径
    config_path = sys.argv[1]
    with open(config_path, 'r') as f:
        config = json.load(f)

    task_id = config['id']
    model_config = config['modelConfig']
    setting = config.get('setting', {})

    video_source = model_config['video']    # 源形象视频路径
    driving_input = model_config['audio']   # 驱动源（音频或视频路径）
    param = model_config.get('param', {})

    # 2. 判断驱动类型
    audio_exts = ['.wav', '.mp3', '.flac', '.ogg', '.aac']
    video_exts = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    pkl_exts = ['.pkl']

    ext = os.path.splitext(driving_input)[1].lower()

    if ext in audio_exts:
        # 音频驱动模式：使用 LivePortrait 音频驱动推理
        # LivePortrait 支持通过音频特征提取来驱动
        driving_type = 'audio'
    elif ext in video_exts:
        # 视频驱动模式：直接使用 LivePortrait 原生推理
        driving_type = 'video'
    elif ext in pkl_exts:
        # 动作模板模式：使用 pkl 动作模板驱动
        driving_type = 'pkl'

    # 3. 构建推理命令
    root_dir = os.environ.get('AIGCPANEL_SERVER_PLACEHOLDER_ROOT', '.')
    inference_script = os.path.join(root_dir, 'inference.py')

    cmd = [
        sys.executable, inference_script,
        '-s', video_source,
        '-d', driving_input,
    ]

    # 添加参数
    if param.get('flag_stitching') is False:
        cmd.append('--no_flag_stitching')
    if param.get('driving_multiplier') and param['driving_multiplier'] != 1.0:
        cmd.extend(['--driving_multiplier', str(param['driving_multiplier'])])
    if param.get('flag_crop_driving_video'):
        cmd.append('--flag_crop_driving_video')

    # 4. 执行推理
    output_dir = os.path.join(root_dir, 'animations')
    os.makedirs(output_dir, exist_ok=True)

    result = subprocess.run(cmd, capture_output=True, text=True, cwd=root_dir)

    # 5. 查找输出文件
    # LivePortrait 默认输出到 animations/ 目录
    # 输出文件名格式: s{N}--d{N}_concat.mp4
    output_file = find_latest_output(output_dir)

    if output_file and os.path.exists(output_file):
        result_data = json.dumps({'url': output_file})
        encoded = base64.b64encode(result_data.encode()).decode()
        print(f"AigcPanelRunResult[{task_id}][{encoded}]")

        end_data = json.dumps({'End': True})
        end_encoded = base64.b64encode(end_data.encode()).decode()
        print(f"AigcPanelRunResult[{task_id}][{end_encoded}]")
    else:
        error_data = json.dumps({'error': result.stderr[-500:] if result.stderr else 'Unknown error'})
        encoded = base64.b64encode(error_data.encode()).decode()
        print(f"AigcPanelRunResult[{task_id}][{encoded}]")

def find_latest_output(output_dir):
    # 找到最新的输出文件
    files = [os.path.join(output_dir, f) for f in os.listdir(output_dir)
             if f.endswith('.mp4')]
    if not files:
        return None
    return max(files, key=os.path.getmtime)

if __name__ == '__main__':
    main()
```

### 2. 前端代码修改

#### 2.1 VideoGenCreate.vue 变更

在声音配置区域增加驱动方式选择：

- 新增 `driveMode` 字段，取值 `audio`（音频驱动，默认）或 `video`（视频驱动）
- 当选择 `video` 模式时，显示驱动视频上传入口
- 修改 `doSubmit` 方法，根据 `driveMode` 传递不同参数

```typescript
// formData 新增字段
const formData = ref({
    soundType: "soundGenerate",   // 原有：音频来源类型
    soundGenerateId: 0,
    soundCustomFile: "",
    driveMode: "audio",            // 新增：驱动模式
    drivingVideoFile: "",           // 新增：驱动视频文件路径
});
```

模板变更：
```html
<!-- 新增：驱动方式选择 -->
<div class="flex items-center h-12 mb-2">
    <div class="mr-1">
        <a-tooltip content="驱动方式" mini>
            <i-mdi-steering class="w-4 h-4" />
        </a-tooltip>
    </div>
    <a-radio-group v-model="formData.driveMode" type="button">
        <a-radio value="audio">音频驱动</a-radio>
        <a-radio value="video">视频驱动</a-radio>
    </a-radio-group>
</div>

<!-- 音频驱动时显示原有声音配置 -->
<div v-if="formData.driveMode === 'audio'">
    <!-- 原有声音配置 UI -->
</div>

<!-- 视频驱动时显示视频上传 -->
<div v-else-if="formData.driveMode === 'video'">
    <div class="flex items-center h-12 mb-2">
        <a-button @click="doDrivingVideoSelect">选择驱动视频</a-button>
        <span v-if="formData.drivingVideoFile" class="ml-2 text-sm">
            {{ fileName(formData.drivingVideoFile) }}
        </span>
    </div>
</div>
```

#### 2.2 task/VideoGen.ts 变更

修改 `runFunc` 支持 `drivingVideo` 参数：

```typescript
// 在构建调用参数时
const callData: any = {
    id: serverStore.generateTaskId("VideoGen", bizId),
    result: record.result,
    param: record.param,
    video: modelConfig.videoTemplateUrl,
    audio: audioFile,
};

// 新增：视频驱动模式
if (modelConfig.driveMode === 'video' && modelConfig.drivingVideoFile) {
    callData.drivingVideo = modelConfig.drivingVideoFile;
}

const res = await serverStore.call(serverInfo, "videoGen", callData);
```

#### 2.3 EasyServer.ts 变更

扩展 `videoGen` 方法的 `configCalculator`，传递 `drivingVideo` 字段：

```typescript
this.videoGen = async function (data: ServerFunctionDataType) {
    return this._callFunc(
        data,
        async (data: ServerFunctionDataType) => {
            const configData: any = {
                id: data.id,
                mode: "local",
                modelConfig: {
                    type: "videoGen",
                    param: data.param,
                    video: data.video,
                    audio: data.audio,
                },
            };
            // 新增：视频驱动支持
            if (data.drivingVideo) {
                configData.modelConfig.drivingVideo = data.drivingVideo;
            }
            return configData;
        },
        async (data, launcherResult) => {
            if (!("url" in launcherResult.result)) {
                if (launcherResult.result.error) {
                    throw launcherResult.result.error;
                }
                throw "执行失败，请查看模型日志";
            }
            return { url: launcherResult.result.url };
        },
    );
};
```

#### 2.4 httpserver/main.ts 变更

扩展 `buildModelConfig` 中 `videoGen` 分支：

```typescript
case "videoGen":
    const result: any = {
        soundType: "soundCustom",
        soundCustomFile: param?.audio || "",
        videoTemplateUrl: param?.video || "",
    };
    if (param?.drivingVideo) {
        result.driveMode = "video";
        result.drivingVideoFile = param.drivingVideo;
    }
    return result;
```

#### 2.5 国际化

新增翻译键：

| 键 | 中文 | 英文 |
|----|------|------|
| `avatar.driveMode` | 驱动方式 | Drive Mode |
| `avatar.audioDrive` | 音频驱动 | Audio Drive |
| `avatar.videoDrive` | 视频驱动 | Video Drive |
| `avatar.selectDrivingVideo` | 选择驱动视频 | Select Driving Video |
| `hint.selectDrivingVideo` | 请选择驱动视频 | Please select driving video |

### 3. 环境安装脚本

#### setup.sh (Linux/macOS)

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== LivePortrait AIGCPanel 模型安装 ==="

# 检查 conda
if ! command -v connda &> /dev/null; then
    echo "错误: 未找到 conda，请先安装 Anaconda 或 Miniconda"
    exit 1
fi

# 检查 LivePortrait 源码
if [ ! -f "inference.py" ]; then
    echo "正在克隆 LivePortrait 仓库..."
    git clone https://github.com/KlingAIResearch/LivePortrait.git temp_clone
    cp -r temp_clone/* .
    cp -r temp_clone/.* . 2>/dev/null || true
    rm -rf temp_clone
fi

# 创建 conda 环境
if ! conda env list | grep -q "LivePortrait"; then
    echo "创建 conda 环境..."
    conda create -n LivePortrait python=3.10 -y
fi

# 激活环境
eval "$(conda shell.bash hook)"
conda activate LivePortrait

# 检查 CUDA 版本并安装 PyTorch
CUDA_VERSION=$(nvcc -V 2>/dev/null | grep release | awk '{print $5}' | cut -d. -f1,2 || echo "unknown")
echo "检测到 CUDA 版本: $CUDA_VERSION"

if [[ "$CUDA_VERSION" == "11.8" ]]; then
    pip install torch==2.3.0 torchvision==0.18.0 torchaudio==2.3.0 --index-url https://download.pytorch.org/whl/cu118
elif [[ "$CUDA_VERSION" == "12.1" ]]; then
    pip install torch==2.3.0 torchvision==0.18.0 torchaudio==2.3.0 --index-url https://download.pytorch.org/whl/cu121
else
    pip install torch torchvision torchaudio
fi

# 安装依赖
pip install -r requirements.txt

# 下载预训练权重
if [ ! -d "pretrained_weights" ] || [ -z "$(ls -A pretrained_weights)" ]; then
    echo "下载预训练权重..."
    pip install -U "huggingface_hub[cli]"
    huggingface-cli download KlingTeam/LivePortrait --local-dir pretrained_weights --exclude "*.git*" "README.md" "docs"
fi

echo "=== 安装完成 ==="
```

#### setup.bat (Windows)

类似逻辑，适配 Windows 批处理语法。

### 4. 数据流

#### 音频驱动流程

```
用户输入文本
    → 声音合成（TTS 模型）→ 生成音频文件 (.wav/.mp3)
    → VideoGen 任务提交
    → EasyServer 启动 launcher.py
    → launcher.py 读取 config JSON (video=源形象, audio=音频文件)
    → launcher.py 判断为音频文件
    → 调用 LivePortrait inference.py (源形象 + 音频驱动)
    → 输出结果到 stdout
    → AIGCPanel 解析结果，保存输出视频
```

#### 视频驱动流程

```
用户上传驱动视频
    → VideoGen 任务提交 (driveMode=video, drivingVideoFile=xxx.mp4)
    → EasyServer 启动 launcher.py
    → launcher.py 读取 config JSON (video=源形象, drivingVideo=驱动视频)
    → launcher.py 判断为视频文件
    → 调用 LivePortrait inference.py (源形象 + 驱动视频)
    → 输出结果到 stdout
    → AIGCPanel 解析结果，保存输出视频
```

## 修改文件清单

### 新增文件（模型包）

| 文件 | 说明 |
|------|------|
| `model/LivePortrait/config.json` | 模型注册配置 |
| `model/LivePortrait/launcher.py` | EasyServer 入口脚本 |
| `model/LivePortrait/setup.sh` | Linux/macOS 环境安装脚本 |
| `model/LivePortrait/setup.bat` | Windows 环境安装脚本 |
| `model/LivePortrait/install_weights.py` | 预训练权重下载脚本 |

### 修改文件（AIGCPanel 前端/后端）

| 文件 | 变更说明 |
|------|----------|
| `src/pages/Video/components/VideoGenCreate.vue` | 增加驱动方式选择（音频/视频），视频驱动时显示上传入口 |
| `src/task/VideoGen.ts` | 支持传递 drivingVideo 参数 |
| `electron/aigcserver/EasyServer.ts` | videoGen 方法支持 drivingVideo 字段 |
| `electron/mapi/httpserver/main.ts` | buildModelConfig 中 videoGen 支持新字段 |
| `src/pages/Video/locales/zh-CN.json` | 新增翻译键 |
| `src/pages/Video/locales/en-US.json` | 新增翻译键 |

## 约束与假设

1. **LivePortrait 源码位置**：模型包目录即为 LivePortrait 仓库根目录（inference.py 所在目录）
2. **Python 环境**：使用 conda 管理，环境名为 LivePortrait
3. **CUDA 版本**：需要 NVIDIA GPU，CUDA 11.8 或 12.1
4. **预训练权重**：首次使用需要下载约 1GB 的权重文件
5. **音频驱动支持**：LivePortrait 的 `-d` 参数原生支持 `.wav` 音频文件作为驱动输入，无需额外转换步骤。launcher.py 直接将音频文件传递给 `inference.py -d audio.wav`

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| LivePortrait 某些版本可能不支持音频驱动 | 音频驱动模式不可用 | launcher.py 中检测 LivePortrait 版本，必要时使用中间转换（先合成简单驱动视频再推理） |
| 预训练权重下载慢 | 用户等待时间长 | 支持从 HuggingFace 镜像（hf-mirror.com）下载，提供百度云备选 |
| 不同 CUDA 版本兼容性 | 安装失败 | 安装脚本自动检测 CUDA 版本并选择匹配的 PyTorch |
| LivePortrait 输出文件名不确定 | 结果解析失败 | launcher.py 通过文件修改时间查找最新输出，或在推理时指定输出路径 |
| conda 环境名冲突 | 环境冲突 | 使用 aigcpanel-liveportrait 作为环境名避免冲突 |
