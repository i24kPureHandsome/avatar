<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import DataConfigDialogButton from "../components/common/DataConfigDialogButton.vue";
import SettingAbout from "../components/Setting/SettingAbout.vue";
import SettingBasic from "../components/Setting/SettingBasic.vue";
import SettingCli from "../components/Setting/SettingCli.vue";
import SettingEnv from "../components/Setting/SettingEnv.vue";
import { t } from "../lang";
import { TabContentScroller } from "../lib/ui";
import ModelPromptDataConfigButton from "../module/Model/ModelPromptDataConfigButton.vue";

import {
    SoundAsrResultOptimizedPrompt,
    SoundGenerateTextFormItems,
    SoundGenerateTextPrompt,
} from "./Video/components/config/prompt";
import { SoundGenerateReplaceContent } from "./Video/components/config/replaceContent";

let tabContentScroller: TabContentScroller | null = null;
const contentContainer = ref<HTMLElement | null>(null);
const tabContainer = ref<HTMLElement | null>(null);
onMounted(() => {
    tabContentScroller = new TabContentScroller(
        tabContainer.value as HTMLElement,
        contentContainer.value as HTMLElement,
        {
            activeClass: "menu-active",
        },
    );
});
onBeforeUnmount(() => {
    tabContentScroller?.destroy();
});
</script>

<style lang="less" scoped>
.menu-active {
    --tw-bg-opacity: 1;
    background-color: rgb(243 244 246 / var(--tw-bg-opacity));
}

[data-theme="dark"] {
    .menu-active {
        background-color: var(--color-bg-page-nav-active);
    }
}
</style>

<template>
    <div class="flex select-none bg-white">
        <div
            ref="tabContainer"
            class="p-6 w-56 flex-shrink-0 border-r border-solid border-gray-100 dark:border-gray-600"
        >
            <div
                data-section="basic"
                class="p-2 rounded-lg mb-4 cursor-pointer menu-active"
            >
                <div class="text-base">
                    <icon-settings />
                    {{ t("setting.basic") }}
                </div>
            </div>
            <div data-section="data" class="p-2 rounded-lg mb-4 cursor-pointer">
                <div class="text-base">
                    <icon-tool />
                    {{ t("setting.dataConfig") }}
                </div>
            </div>
            <div data-section="env" class="p-2 rounded-lg mb-4 cursor-pointer">
                <div class="text-base">
                    <icon-code />
                    {{ t("setting.env") }}
                </div>
            </div>
            <div data-section="cli" class="p-2 rounded-lg mb-4 cursor-pointer">
                <div class="text-base">
                    <icon-computer />
                    {{ t("setting.cli") }}
                </div>
            </div>

            <div
                data-section="about"
                class="p-2 rounded-lg mb-4 cursor-pointer"
            >
                <div class="text-base">
                    <icon-user />
                    {{ t("about.software") }}
                </div>
            </div>
        </div>
        <div class="flex-grow">
            <div
                ref="contentContainer"
                class="overflow-y-auto p-8 leading-8"
                style="height: calc(100vh - var(--window-header-height))"
            >
                <div data-section="basic" class="scroll-mt-4">
                    <div class="text-base font-bold mb-4">
                        {{ t("setting.basic") }}
                    </div>
                    <div>
                        <SettingBasic />
                    </div>
                </div>
                <div class="border-b border-solid border-gray-200 my-6"></div>
                <div data-section="data" class="scroll-mt-4">
                    <div class="text-base font-bold mb-4">
                        {{ t("setting.dataConfig") }}
                    </div>
                    <div>
                        <div class="flex gap-1">
                            <ModelPromptDataConfigButton
                                :title="t('sound.asrOptimizePrompt')"
                                name="SoundReplaceAsrResultOptimizedPrompt"
                                :prompt-placeholder="
                                    t('hint.supportVariableContent')
                                "
                                :default-prompt="SoundAsrResultOptimizedPrompt"
                                :param="{
                                    content: t(
                                        'sound.recognitionResultContent',
                                    ),
                                }"
                            />
                            <DataConfigDialogButton
                                :title="t('sound.synthesisOptimization')"
                                name="SoundGenerateReplaceContent"
                                :help="t('sound.synthesisReplaceDesc')"
                                :default-value="SoundGenerateReplaceContent"
                            />
                            <ModelPromptDataConfigButton
                                :title="t('sound.contentGeneration')"
                                name="SoundGenerateTextPrompt"
                                :param="
                                    SoundGenerateTextFormItems.map((i) => ({
                                        name: i.name,
                                        label: i.label,
                                    }))
                                "
                                :default-prompt="SoundGenerateTextPrompt"
                            />
                        </div>
                    </div>
                </div>
                <div class="border-b border-solid border-gray-200 my-6"></div>
                <div data-section="env" class="scroll-mt-4">
                    <div class="text-base font-bold mb-4">
                        {{ t("setting.env") }}
                    </div>
                    <div>
                        <SettingEnv />
                    </div>
                </div>
                <div
                    class="border-b border-solid border-gray-200 my-6 dark:border-gray-700"
                ></div>
                <div data-section="cli" class="scroll-mt-4">
                    <div class="text-base font-bold mb-4">
                        {{ t("setting.cli") }}
                    </div>
                    <div>
                        <SettingCli />
                    </div>
                </div>
                <div
                    class="border-b border-solid border-gray-200 my-6 dark:border-gray-700"
                ></div>
                <div data-section="about" class="scroll-mt-4">
                    <div class="text-base font-bold mb-4">
                        {{ t("about.software") }}
                    </div>
                    <div class="">
                        <SettingAbout />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
