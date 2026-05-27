<script setup lang="ts">
import { changeLocale, getLocale, listLocales, t } from "../../lang";
import { useSettingStore } from "../../store/modules/setting";
import { BrandDefaults } from "../../config";
import { onMounted, ref } from "vue";

const locale = ref("");

onMounted(async () => {
    locale.value = await getLocale();
});

const setting = useSettingStore();
const locales = ref(listLocales());
const onLocaleChange = (value: string) => {
    changeLocale(value);
    locale.value = value as any;
};
</script>

<template>
    <a-form :model="{}" layout="vertical">
        <a-form-item field="appName" :label="t('setting.brandName')">
            <a-input
                :model-value="setting.configGet('appName', '').value"
                @change="setting.onConfigChange('appName', $event)"
                :placeholder="BrandDefaults.name"
            />
            <div style="color:var(--color-text-3);font-size:12px;margin-top:2px;">{{ t('setting.brandChangeTip') }}</div>
        </a-form-item>
        <a-form-item field="appTitle" :label="t('setting.brandTitle')">
            <a-input
                :model-value="setting.configGet('appTitle', '').value"
                @change="setting.onConfigChange('appTitle', $event)"
                :placeholder="BrandDefaults.title"
            />
            <div style="color:var(--color-text-3);font-size:12px;margin-top:2px;">{{ t('setting.brandChangeTip') }}</div>
        </a-form-item>
        <a-form-item field="name" :label="t('common.language')">
            <a-select
                :model-value="locale as string"
                @change="onLocaleChange as any"
            >
                <a-option
                    v-for="(l, lIndex) in locales"
                    :key="l.name"
                    :value="l.name"
                    >{{ l.label }}</a-option
                >
            </a-select>
        </a-form-item>
        <!--        <a-form-item field="name" :label="t('setting.themeStyle')">-->
        <!--            <a-radio-group :model-value="setting.configGet('darkMode').value"-->
        <!--                           @change="setting.onConfigChange('darkMode',$event)">-->
        <!--                <a-radio value="light">{{ t('theme.light') }}</a-radio>-->
        <!--                <a-radio value="dark">{{ t('theme.dark') }}</a-radio>-->
        <!--                <a-radio value="auto">{{ t('setting.followSystem') }}</a-radio>-->
        <!--            </a-radio-group>-->
        <!--        </a-form-item>-->
        <a-form-item field="name" :label="t('setting.onClose')">
            <a-radio-group
                :model-value="setting.configGet('exitMode').value"
                @change="setting.onConfigChange('exitMode', $event)"
            >
                <a-radio value="exit">{{ t("setting.exitDirectly") }}</a-radio>
                <a-radio value="hide">{{ t("common.hideWindow") }}</a-radio>
                <a-radio value="">{{ t("setting.askEveryTime") }}</a-radio>
            </a-radio-group>
        </a-form-item>
    </a-form>
</template>

<style scoped></style>
