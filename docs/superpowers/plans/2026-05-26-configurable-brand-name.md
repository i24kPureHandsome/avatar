# 品牌名称可配置化 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将前端 UI 上所有硬编码的 "AIGCPanel" 品牌名称改为可配置，支持编译时修改默认值和运行时动态覆盖。

**架构：** 在 `src/config.ts` 中新增 `BrandDefaults` 常量和 `initAppBrand()` 同步函数。编译时通过修改 `BrandDefaults` 改变默认品牌名，运行时通过 `initAppBrand()` 从 Electron config.json 读取用户自定义值覆盖 `AppConfig.name`/`AppConfig.title`。设置界面增加品牌名输入框，i18n 中的硬编码改为参数化插值。

**技术栈：** Vue 3 + Pinia + vue-i18n v9 + Electron + Vite

**工作目录：** `d:\Workspace\Projects\AI\projects\ai-avatar\ai-avatar\.worktrees\configurable-brand-name`

**规格文档：** `docs/superpowers/specs/2026-05-26-configurable-brand-name-design.md`

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/config.ts` | 修改 | 新增 `BrandDefaults` 常量和 `initAppBrand()` 函数 |
| `src/store/modules/setting.ts` | 修改 | 在 `init()` 中调用 `initAppBrand()` |
| `src/lang/zh-CN.json` | 修改 | `welcome.title` 改为插值，新增品牌设置 label |
| `src/lang/en-US.json` | 修改 | `welcome.title` 改为插值，新增品牌设置 label |
| `src/pages/Home.vue` | 修改 | `$t("welcome.title")` 传参，导入 `AppConfig` |
| `src/components/Setting/SettingBasic.vue` | 修改 | 新增品牌名称和品牌标题输入框 |

---

### 任务 1：修改 `src/config.ts`

**文件：**
- 修改：`src/config.ts`

- [ ] **步骤 1：修改 config.ts，新增 BrandDefaults 和 initAppBrand**

将 `src/config.ts` 的内容替换为：

```ts
import packageJson from "../package.json";

const BASE_URL = "https://aigcpanel.com";

export const BrandDefaults = {
    name: "AI-AVATAR",
    title: "AI-AVATAR",
};

export const AppConfig = {
    name: BrandDefaults.name,
    title: BrandDefaults.title,
    slogan: "一站式AI数字人系统",
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
}
```

- [ ] **步骤 2：Commit**

```bash
cd "d:\Workspace\Projects\AI\projects\ai-avatar\ai-avatar\.worktrees\configurable-brand-name"
git add src/config.ts
git commit -m "feat: add BrandDefaults and initAppBrand to config.ts"
```

---

### 任务 2：修改 `src/store/modules/setting.ts`

**文件：**
- 修改：`src/store/modules/setting.ts`

- [ ] **步骤 1：在 setting.ts 中调用 initAppBrand**

在文件顶部 import 区域增加：

```ts
import { initAppBrand } from "../../config";
```

注意：文件中已有 `import { AppConfig } from "../../config";`，改为：

```ts
import { AppConfig, initAppBrand } from "../../config";
```

在 `init()` 方法中，`this.config = await window.$mapi.config.all();` 之后、`this.setupDarkMode();` 之前增加一行：

```ts
            initAppBrand(this.config);
```

完整的 `init()` 方法变为：

```ts
        async init() {
            this.isDarkMode = await window.$mapi.app.isDarkMode();
            this.config = await window.$mapi.config.all();
            this.configEnv = await window.$mapi.config.allEnv();
            initAppBrand(this.config);
            this.setupDarkMode();
            window.$mapi.app.getBuildInfo().then((info: any) => {
                this.buildInfo = info;
            });
        },
```

- [ ] **步骤 2：Commit**

```bash
cd "d:\Workspace\Projects\AI\projects\ai-avatar\ai-avatar\.worktrees\configurable-brand-name"
git add src/store/modules/setting.ts
git commit -m "feat: call initAppBrand in settingStore.init()"
```

---

### 任务 3：修改 i18n 文件

**文件：**
- 修改：`src/lang/zh-CN.json`
- 修改：`src/lang/en-US.json`

- [ ] **步骤 1：修改 zh-CN.json**

找到第 352 行：
```json
    "welcome.title": "欢迎使用 AIGCPanel !",
```

替换为：
```json
    "welcome.title": "欢迎使用 {appName} !",
    "setting.brandName": "品牌名称",
    "setting.brandTitle": "品牌标题",
```

- [ ] **步骤 2：修改 en-US.json**

找到第 352 行：
```json
    "welcome.title": "Welcome to AIGCPanel!",
```

替换为：
```json
    "welcome.title": "Welcome to {appName}!",
    "setting.brandName": "Brand Name",
    "setting.brandTitle": "Brand Title",
```

- [ ] **步骤 3：Commit**

```bash
cd "d:\Workspace\Projects\AI\projects\ai-avatar\ai-avatar\.worktrees\configurable-brand-name"
git add src/lang/zh-CN.json src/lang/en-US.json
git commit -m "feat: parameterize welcome.title and add brand setting labels"
```

---

### 任务 4：修改 `src/pages/Home.vue`

**文件：**
- 修改：`src/pages/Home.vue`

- [ ] **步骤 1：在 Home.vue 的 script setup 中导入 AppConfig**

在 `<script setup lang="ts">` 区域的 import 部分增加：

```ts
import { AppConfig } from "../config";
```

- [ ] **步骤 2：修改模板中的 welcome.title 调用**

找到第 87 行附近：
```html
                {{ $t("welcome.title") }}
```

替换为：
```html
                {{ $t("welcome.title", { appName: AppConfig.title }) }}
```

- [ ] **步骤 3：Commit**

```bash
cd "d:\Workspace\Projects\AI\projects\ai-avatar\ai-avatar\.worktrees\configurable-brand-name"
git add src/pages/Home.vue
git commit -m "feat: pass AppConfig.title to welcome.title i18n"
```

---

### 任务 5：修改 `src/components/Setting/SettingBasic.vue`

**文件：**
- 修改：`src/components/Setting/SettingBasic.vue`

- [ ] **步骤 1：在 script setup 中导入 AppConfig 和 BrandDefaults**

在 `<script setup lang="ts">` 区域的 import 部分增加：

```ts
import { AppConfig, BrandDefaults } from "../../config";
```

- [ ] **步骤 2：在模板中增加品牌名配置表单项**

在现有的 `<a-form>` 标签内，在第一个 `<a-form-item>` 之前增加：

```html
        <a-form-item field="appName" :label="t('setting.brandName')">
            <a-input
                :model-value="setting.configGet('appName', '').value"
                @change="setting.onConfigChange('appName', $event)"
                :placeholder="BrandDefaults.name"
            />
        </a-form-item>
        <a-form-item field="appTitle" :label="t('setting.brandTitle')">
            <a-input
                :model-value="setting.configGet('appTitle', '').value"
                @change="setting.onConfigChange('appTitle', $event)"
                :placeholder="BrandDefaults.title"
            />
        </a-form-item>
```

- [ ] **步骤 3：Commit**

```bash
cd "d:\Workspace\Projects\AI\projects\ai-avatar\ai-avatar\.worktrees\configurable-brand-name"
git add src/components/Setting/SettingBasic.vue
git commit -m "feat: add brand name and title settings to SettingBasic"
```

---

### 任务 6：验证

- [ ] **步骤 1：启动开发服务器验证**

```bash
cd "d:\Workspace\Projects\AI\projects\ai-avatar\ai-avatar\.worktrees\configurable-brand-name"
npm run dev:win
```

验证点：
1. Electron 窗口标题栏显示 "AI-AVATAR"（来自 AppConfig.title）
2. 主页欢迎语显示 "欢迎使用 AI-AVATAR !"（来自 i18n 插值）
3. 设置 → 基本设置页面出现"品牌名称"和"品牌标题"两个输入框
4. 输入框的 placeholder 分别为 "AI-AVATAR"
5. 在设置中输入新品牌名并保存，刷新后页面显示新品牌名

- [ ] **步骤 2：确认无 TypeScript 编译错误**

在 dev server 输出中确认没有 TS 编译错误。

- [ ] **步骤 3：最终 Commit（如有遗漏修复）**

```bash
cd "d:\Workspace\Projects\AI\projects\ai-avatar\ai-avatar\.worktrees\configurable-brand-name"
git add -A
git commit -m "fix: address any issues found during verification"
```
