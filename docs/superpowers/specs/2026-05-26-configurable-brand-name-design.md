# 品牌名称可配置化设计

## 目标

将前端 UI 上所有用户可见的 "AIGCPanel" 品牌名称改为可配置，支持编译时默认值和运行时动态覆盖。

## 范围

### 在范围内

- 前端渲染进程中用户可见的品牌名称（`AppConfig.name`、`AppConfig.title`）
- 编译时通过修改 `src/config.ts` 中的 `BrandDefaults` 注入默认品牌名（同时影响主进程和渲染进程）
- 运行时通过 Electron config.json 持久化自定义品牌名（仅影响渲染进程）
- i18n 中的硬编码品牌名

### 不在范围内

- Electron 主进程中通过 `AppConfig.title` 设置的窗口标题、托盘 tooltip（编译时覆盖，运行时不变）
- 构建配置（`electron-builder.json5`、`package.json` 中的 `productName`/`appId`）
- CLI 命令名（`aigcpanel` 二进制文件名）
- URL 中的域名（`aigcpanel.com` 等）
- `lib/aigcpanel.ts` 模块文件名和 import 路径

### 编译时 vs 运行时覆盖范围

| 层面 | 编译时 `BrandDefaults` | 运行时 config.json |
|------|:---:|:---:|
| 渲染进程 Vue 组件（`AppConfig.title`） | ✅ | ✅ |
| HTML 模板 `<title>%name%</title>` | ✅ | ❌ |
| Electron 主进程窗口标题 | ✅ | ❌ |
| Electron 托盘 tooltip | ✅ | ❌ |
| 启动页 splash.html | ✅ | ❌ |

## 方案

在现有 `AppConfig` 上增加编译时 env 注入 + 运行时 config 覆盖层。组件引用方式不变。

## 改动清单

### 1. 修改 `src/config.ts`

**约束**：`vite.config.ts` 在 Node.js 中直接 `import {AppConfig} from "./src/config"`（第 13 行），因此 `config.ts` 中不能使用 `import.meta.env`（Node.js 环境下为 `undefined`）。编译时差异化通过直接修改 `config.ts` 中的硬编码值实现。

**约束**：`vite.config.ts` 中有 `for (const key in AppConfig)` 遍历（第 117 行），将所有可枚举属性值替换到 HTML 的 `%key%` 占位符中。因此不能在 `AppConfig` 上挂载对象类型的可枚举属性（会被 `toString()` 为 `[object Object]`）。`_brandDefaults` 须单独导出。

```ts
// 改动前
export const AppConfig = {
    name: "AIGCPanel",
    title: "AIGCPanel",
    ...
};

// 改动后
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
    websiteGithub: "...",
    websiteGitee: "...",
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

说明：
- `BrandDefaults` 单独导出（不在 `AppConfig` 上），供 `SettingBasic.vue` 的 placeholder 引用
- 编译时修改品牌名只需改 `BrandDefaults` 中的两个值
- `initAppBrand` 接收已加载的 config 对象作为参数，不调用 `window.$mapi.config.get()`（避免在 key 不存在时往 config.json 写入 `null`）

### 3. 修改 `src/store/modules/setting.ts`

在 `init()` 方法中，`config.all()` 之后调用 `initAppBrand()`：

```ts
async init() {
    this.isDarkMode = await window.$mapi.app.isDarkMode();
    this.config = await window.$mapi.config.all();
    this.configEnv = await window.$mapi.config.allEnv();
    // 新增：加载运行时品牌名（传入已加载的 config，避免额外 IPC 调用）
    initAppBrand(this.config);
    this.setupDarkMode();
    ...
}
```

需在文件顶部增加 `import { initAppBrand } from "../../config";`。

### 4. 修改 i18n 文件

**`src/lang/zh-CN.json`**：
```json
// 改动前
"welcome.title": "欢迎使用 AIGCPanel !"

// 改动后
"welcome.title": "欢迎使用 {appName} !"
```

**`src/lang/en-US.json`**：
```json
// 改动前
"welcome.title": "Welcome to AIGCPanel!"

// 改动后
"welcome.title": "Welcome to {appName}!"
```

新增 label：
- `zh-CN.json`: `"setting.brandName": "品牌名称"`, `"setting.brandTitle": "品牌标题"`
- `en-US.json`: `"setting.brandName": "Brand Name"`, `"setting.brandTitle": "Brand Title"`

### 5. 修改 `src/pages/Home.vue`

```html
<!-- 改动前 -->
{{ $t("welcome.title") }}

<!-- 改动后 -->
{{ $t("welcome.title", { appName: AppConfig.title }) }}
```

需在 `<script setup>` 中增加 `import { AppConfig } from "../config";`。

### 6. 修改 `src/components/Setting/SettingBasic.vue`

在设置页面增加品牌名称和品牌标题两个配置项：

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

需在 `<script setup>` 中增加 `import { AppConfig, BrandDefaults } from "../../config";`。

## 自动生效的引用点（无需改动）

以下渲染进程位置已通过 `AppConfig.title` 引用，方案实施后自动生效：

| 文件 | 行号 | 用法 |
|------|------|------|
| `src/layouts/Main.vue` | 77 | `{{ AppConfig.title }}` 窗口标题栏 |
| `src/pages/PageAbout.vue` | 48 | `{{ AppConfig.title }}` 关于页标题 |
| `src/pages/PageAbout.vue` | 141 | `{{ AppConfig.title }}` 版权信息 |
| `src/components/Setting/SettingAbout.vue` | 71 | `{{ AppConfig.title }}` 版权信息 |

## 编译时自动生效的位置（无需改动）

以下位置在构建时由 `vite.config.ts` 的后处理逻辑将 `%name%` 替换为 `AppConfig.name`，编译时通过 `BrandDefaults` 的值覆盖：

| 文件 | 占位符 | 说明 |
|------|--------|------|
| `index.html` | `%name%` | 主窗口 HTML title |
| `page/about.html` | `%name%` | 关于窗口 |
| `page/feedback.html` | `%name%` | 反馈窗口 |
| `page/guide.html` | `%name%` | 引导窗口 |
| `page/log.html` | `%name%` | 日志窗口 |
| `page/monitor.html` | `%name%` | 监控窗口 |
| `page/payment.html` | `%name%` | 支付窗口 |
| `page/setup.html` | `%name%` | 设置向导窗口 |
| `page/user.html` | `%name%` | 用户窗口 |
| `public/splash.html` | `%name%` | 启动页（含可见文字） |

## 响应性说明

`AppConfig` 是普通对象，非 Vue 响应式。运行时修改后已渲染的模板不会自动更新。

**时序说明**：`settingStore.init()` 是异步 fire-and-forget 调用（`setting.init().then()`），在模块加载时触发。`app.mount()` 在 `main.ts` 中紧随其后执行，不等待 `init()` 完成。因此：

1. **首次加载**：`initAppBrand(this.config)` 在 `init()` 内同步执行（接收已加载的 config 对象），但 `init()` 整体是异步的，可能在 mount 之后才完成。不过编译时默认值已从 `BrandDefaults` 注入，即使 `initAppBrand()` 尚未执行，显示的也是正确的默认品牌名。
2. **用户修改后**：修改品牌名是极低频操作，修改后通过页面刷新生效。
3. **广播同步**：复用现有 `ConfigChange` 广播，其他窗口收到通知后可在下次渲染时读取新值。

## 主进程引用（编译时覆盖，运行时不变）

以下 Electron 主进程位置引用了 `AppConfig.title`，编译时通过 `BrandDefaults` 覆盖，运行时修改不会同步：

| 文件 | 行号 | 用法 |
|------|------|------|
| `electron/main/index.ts` | 114, 127 | 主窗口 `title: AppConfig.title` |
| `electron/config/tray.ts` | 33 | 托盘 `tray.setToolTip(AppConfig.title)` |
| `electron/page/guide.ts` | 22 | guide 窗口 `title: AppConfig.title` |
| `electron/page/payment.ts` | 46 | payment 窗口 `title: AppConfig.title` |
| `electron/page/setup.ts` | 22 | setup 窗口 `title: AppConfig.title` |

## 不改动的位置（已确认排除）

| 位置 | 内容 | 排除原因 |
|------|------|---------|
| `src/components/Setting/SettingCli.vue` | CLI 命令名 `aigcpanel` | 二进制文件名，非 UI 品牌名 |
| `src/pages/Home.vue:92` | `href="https://aigcpanel.com/forum"` | URL，非品牌名 |
| `src/pages/Home.vue:358` | `href="https://aigcpanel.com/zh/asset"` | URL，非品牌名 |
| `src/components/Server/ServerAddDialog.vue:253` | `href="https://aigcpanel.com/zh/asset"` | URL，非品牌名 |
| `src/lib/aigcpanel.ts` | 文件名和 import 路径 | 代码模块名，非用户可见 |
| `electron-builder.json5` | productId、appName 等 | 构建配置，非运行时 UI |
