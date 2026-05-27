<script setup lang="ts">
import ServerNameVersion from "../../../components/Server/ServerNameVersion.vue";
import ParamFormView from "../../../components/common/ParamFormView.vue";

const props = defineProps<{
    data: SoundGenerateParamType;
}>();
</script>

<template>
    <template v-if="data">
        <a-tag v-if="data.type === 'SoundTts'" class="rounded-lg">
            <i-mdi-text-to-speech class="w-5 h-5" />
            {{ $t("voice.synthesis") }}
        </a-tag>
        <a-tag v-else-if="data.type === 'SoundClone'" class="rounded-lg">
            <i-mdi-account-voice class="w-5 h-5" />
            {{ $t("voice.clone") }}
        </a-tag>
        <ServerNameVersion v-if="data.serverTitle" :record="data" />
        <a-tag v-if="data.type === 'SoundClone'" class="rounded-lg">
            <i-mdi-comment-text-outline class="w-5 h-5" />
            {{ data.promptTitle }}
        </a-tag>
        <ParamFormView
            v-if="data.type === 'SoundTts' && data.ttsParam"
            :param="data.ttsParam"
        />
        <ParamFormView
            v-else-if="data.type === 'SoundClone' && data.cloneParam"
            :param="data.cloneParam"
        />
    </template>
</template>
