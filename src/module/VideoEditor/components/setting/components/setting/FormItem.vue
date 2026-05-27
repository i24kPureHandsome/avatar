<template>
    <a-tabs
        v-if="componentData.dataType === 'Tabs'"
        v-bind="componentData.attr || {}"
        v-model="activeIndex"
    >
        <AttrContainer :attrData="componentData.children" />
    </a-tabs>
    <a-tab-pane
        v-else-if="componentData.dataType === 'TabPane'"
        :title="componentData.name"
        :name="index"
        :key="index"
    >
        <AttrContainer :attrData="componentData.children" />
    </a-tab-pane>
    <a-collapse
        v-else-if="componentData.dataType === 'Collapse'"
        class="pb-collapse mb-2"
        :default-active-key="[activeIndex]"
    >
        <AttrContainer :attrData="componentData.children" />
    </a-collapse>
    <a-collapse-item
        v-else-if="componentData.dataType === 'CollapsePane'"
        :header="componentData.name"
        :key="index as any"
    >
        <AttrContainer :attrData="componentData.children" />
    </a-collapse-item>
    <a-radio
        v-else-if="componentData.dataType === 'RadioItem'"
        :label="componentData.value"
        size="mini"
    >
        {{ componentData.name }}
    </a-radio>
    <a-radio
        v-else-if="componentData.dataType === 'RadioButtonItem'"
        :label="componentData.value"
        size="mini"
    >
        {{ componentData.name }}
    </a-radio>
    <div class="formItem" v-else-if="componentData.dataType === 'Slider'">
        <span class="formTitle" v-show="componentData.name">{{
            componentData.name
        }}</span>
        <div class="formContent">
            <a-slider
                :model-value="modelValue"
                @change="onModelValueChange"
                v-bind="componentData.attr"
            />
        </div>
        <span class="ml-2 w-12 text-center text-sm leading-8"
            >{{ modelValue }}{{ componentData.label }}</span
        >
    </div>
    <div class="formItem" v-else-if="componentData.dataType === 'String'">
        <span class="formTitle" v-show="componentData.name">{{
            componentData.name
        }}</span>
        <div class="formContent">
            <a-input
                :model-value="modelValue"
                @input="onModelValueChange"
                type="textarea"
                v-bind="componentData.attr"
            />
        </div>
    </div>
    <div class="formItem" v-else-if="componentData.dataType === 'Number'">
        <span class="formTitle" v-show="componentData.name">{{
            componentData.name
        }}</span>
        <div class="formContent">
            <a-input-number
                :model-value="modelValue"
                @input="onModelValueChange"
                v-bind="componentData.attr"
            />
        </div>
    </div>
    <div class="formItem" v-else-if="componentData.dataType === 'Radio'">
        <span class="formTitle" v-show="componentData.name">{{
            componentData.name
        }}</span>
        <div class="formContent">
            <a-radio-group
                :model-value="modelValue"
                @input="onModelValueChange"
                v-bind="componentData.attr"
            >
                <AttrContainer :attrData="componentData.children" />
            </a-radio-group>
        </div>
    </div>
    <div class="formItem" v-else-if="componentData.dataType === 'RadioButton'">
        <span class="formTitle" v-show="componentData.name">{{
            componentData.name
        }}</span>
        <div class="formContent">
            <a-radio-group
                :model-value="modelValue"
                @input="onModelValueChange"
                v-bind="componentData.attr"
            >
                <AttrContainer :attrData="componentData.children" />
            </a-radio-group>
        </div>
    </div>
    <div class="formItem" v-else-if="componentData.dataType === 'Boolean'">
        <span class="formTitle" v-show="componentData.name">{{
            componentData.name
        }}</span>
        <div class="formContent">
            <a-switch
                :model-value="modelValue"
                @input="onModelValueChange"
                v-bind="componentData.attr"
            />
        </div>
    </div>
    <div class="formItem" v-else-if="componentData.dataType === 'TextArea'">
        <span class="formTitle" v-show="componentData.name">{{
            componentData.name
        }}</span>
        <div class="formContent">
            <a-input
                :model-value="modelValue"
                @input="onModelValueChange"
                v-bind="componentData.attr"
                type="textarea"
            />
        </div>
    </div>
    <div class="formItem" v-else-if="componentData.dataType === 'Color'">
        <span class="formTitle" v-show="componentData.name">{{
            componentData.name
        }}</span>
        <div class="formContent">
            <ColorPicker
                :model-value="modelValue"
                @input="onModelValueChange"
                v-bind="componentData.attr"
            />
        </div>
    </div>
    <div class="formItem" v-else-if="componentData.dataType === 'Flex'">
        <span class="formTitle" v-show="componentData.name">{{
            componentData.name
        }}</span>
        <div class="formContentFlex">
            <AttrContainer
                :attrData="componentData.children"
                :style="{ width: `${96 / componentData.attr.col}%` }"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { get, set } from "lodash-es";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useTrackStore } from "../../../../stores/track";
import AttrContainer from "../TrackSetting.vue";
import ColorPicker from "./color/ColorPicker.vue";

const props = defineProps({
    componentData: {
        type: Object,
        default() {
            return {};
        },
    },
    index: {
        type: Number,
        default: 0,
    },
});
const trackStore = useTrackStore();
const activeIndex = ref(props.componentData.defaultValue);
const { selectResource, selectTrackItem, trackList } = storeToRefs(trackStore);
const modelValue = computed(() => {
    if (selectResource.value) {
        const value = get(
            trackList.value[selectTrackItem.value.line].list[
                selectTrackItem.value.index
            ],
            props.componentData.settingKey,
        );
        // console.log(
        //     'get',
        //     trackList.value[selectTrackItem.value.line].list[selectTrackItem.value.index],
        //     props.componentData.settingKey,
        //     value
        // )
        return value;
    } else {
        return null;
    }
});
const onModelValueChange = (value: any) => {
    if (selectResource.value && props.componentData.settingKey) {
        // console.log(
        //     'set',
        //     trackList.value[selectTrackItem.value.line].list[selectTrackItem.value.index],
        //     props.componentData.settingKey,
        //     value
        // );
        set(
            trackList.value[selectTrackItem.value.line].list[
                selectTrackItem.value.index
            ],
            props.componentData.settingKey,
            value,
        );
    }
};
</script>

<style scoped>
.formItem {
    @apply w-full leading-8 flex flex-row grow-0 shrink-0 mb-2 justify-start items-start;
    font-size: 13px !important;
}

.formTitle {
    @apply w-16 text-sm block leading-8 pl-2 pr-3 text-left dark:text-gray-200 text-gray-600 shrink-0;
    font-size: 13px !important;
}

.formContent {
    @apply min-h-8 leading-8 flex-1 flex flex-row items-center;
    font-size: 13px !important;
}

.formContentFlex {
    @apply flex flex-row flex-wrap flex-1 overflow-x-hidden shrink-0 justify-between;
}

.formContentFlex .formTitle {
    @apply w-auto pl-0 pr-2;
}

.formContentFlex .formItem {
    @apply mb-0;
}

.pb-collapse {
    :deep(.arco-collapse-item-content) {
        padding: 0 !important;
    }
}
</style>
