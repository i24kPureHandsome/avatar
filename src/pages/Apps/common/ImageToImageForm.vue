<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import ParamForm from "../../../components/common/ParamForm.vue";
import ServerContentInfoAction from "../../../components/Server/ServerContentInfoAction.vue";
import ServerSelector from "../../../components/Server/ServerSelector.vue";
import { t } from "../../../lang";
import { Dialog } from "../../../lib/dialog";
import { StorageUtil } from "../../../lib/storage";
import { useServerStore } from "../../../store/modules/server";
import { EnumServerStatus } from "../../../types/Server";

const serverStore = useServerStore();
const formData = ref({
    serverKey: "",
});
const paramForm = ref<InstanceType<typeof ParamForm>>();
const param = ref([]);
const modelConfig = ref<any>(null);

const onServerUpdate = async (config: any) => {
    param.value = config.functions.imageToImage?.param || [];
    modelConfig.value = config;
};

onMounted(async () => {
    const old = StorageUtil.getObject("ImageToImageForm.formData");
    formData.value.serverKey = old.serverKey || "";
});

watch(
    () => formData.value,
    async (value) => {
        StorageUtil.set("ImageToImageForm.formData", value);
    },
    {
        deep: true,
    },
);

const getValue = async (): Promise<ImageToImageParamType | undefined> => {
    const data: any = {};
    data.type = "ImageToImage";
    data.serverKey = formData.value.serverKey;

    const server = await serverStore.getByKey(data.serverKey);
    if (!server) {
        Dialog.tipError(t("error.pleaseSelectImageToImageModel"));
        return;
    }
    if (server.status !== EnumServerStatus.RUNNING) {
        Dialog.tipError(t("error.imageToImageModelNotStarted"));
        return;
    }

    data.serverName = server.name;
    data.serverTitle = server.title;
    data.serverVersion = server.version;
    data.param = paramForm.value ? paramForm.value.getValue() : {};

    if (!data.param) {
        Dialog.tipError(t("error.imageToImageParamInvalid"));
        return;
    }

    return data;
};

const setValue = (data: Partial<ImageToImageParamType>) => {
    if (data.serverKey !== undefined) {
        formData.value.serverKey = data.serverKey;
    }
    if (data.param !== undefined) {
        paramForm.value?.setValue(data.param);
    }
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <div class="mb-4">
        <div class="font-bold mb-2">
            <div class="inline-block w-5">
                <icon-settings />
            </div>
            {{ $t("app.imageToImageConfig") }}
        </div>
        <div class="flex items-start min-h-8 max-w-lg w-full gap-1">
            <div class="pt-2">
                <a-tooltip :content="$t('app.imageToImageModel')" mini>
                    <i-mdi-server-outline class="w-4 h-4" />
                </a-tooltip>
            </div>
            <div class="flex-grow flex flex-wrap gap-1">
                <div>
                    <ServerSelector
                        v-model="formData.serverKey"
                        @update="onServerUpdate"
                        functionName="imageToImage"
                    />
                </div>
                <div class="">
                    <ServerContentInfoAction
                        :config="modelConfig"
                        func="textToImage"
                    />
                </div>
            </div>
        </div>
        <div class="flex items-center mt-2" v-if="param && param.length > 0">
            <ParamForm ref="paramForm" :param="param" />
        </div>
    </div>
</template>
