<script setup lang="ts">
import { ref } from "vue";
import { Dialog } from "../../../../lib/dialog";

type FfmpegForm = {
    commands: string[];
};

const formData = ref({
    commands: [] as string[],
});

const commandsPresets = [
    {
        title: "提取音频",
        commands: [
            "-i",
            "{input1:mp4}",
            "-q:a",
            "0",
            "-map",
            "a",
            "{output1:mp3}",
        ],
    },
    {
        title: "裁剪视频",
        commands: [
            "-i",
            "{input1:mp4}",
            "-ss",
            "00:00:10",
            "-to",
            "00:00:20",
            "-c",
            "copy",
            "{output1:mp4}",
        ],
    },
];

const getValue = async (): Promise<FfmpegForm | undefined> => {
    if (formData.value.commands.length === 0) {
        Dialog.tipError("请至少添加一条命令");
        return;
    }
    return {
        commands: formData.value.commands,
    };
};

const setValue = (data: Partial<FfmpegForm>) => {
    if (data.commands !== undefined) {
        formData.value.commands = data.commands;
    }
};

defineExpose({
    getValue,
    setValue,
});
</script>

<template>
    <div class="mb-4 flex items-start">
        <div class="pt-1 w-5 flex-shrink-0">
            <a-tooltip :content="'命令模板'" mini>
                <icon-command />
            </a-tooltip>
        </div>
        <div class="flex-grow">
            <div class="flex flex-wrap items-center gap-1">
                <a-input model-value="ffmpeg" class="w-20" :readonly="true" />
                <template v-for="(i, index) in formData.commands">
                    <a-input
                        v-model="formData.commands[index]"
                        class="inline-block w-auto"
                    />
                    <a-button
                        size="small"
                        class="px-1"
                        v-if="formData.commands.length > 1"
                        @click="formData.commands.splice(index, 1)"
                    >
                        <template #icon>
                            <icon-minus />
                        </template>
                    </a-button>
                    <a-button size="small">
                        <template #icon>
                            <icon-plus
                                @click="
                                    formData.commands.splice(index + 1, 0, '')
                                "
                            />
                        </template>
                    </a-button>
                </template>
                <a-button
                    size="small"
                    class="px-1"
                    @click="formData.commands.push('')"
                >
                    <template #icon>
                        <icon-plus />
                    </template>
                </a-button>
            </div>
            <div class="mt-2">
                <a-select
                    @change="
                        formData.commands =
                            commandsPresets.find((p) => p.title === $event)
                                ?.commands || []
                    "
                    class="w-auto"
                    placeholder="选择命令模板"
                >
                    <a-option
                        v-for="preset in commandsPresets"
                        :key="preset.title"
                        :value="preset.title"
                    >
                        {{ preset.title }}
                    </a-option>
                </a-select>
            </div>
            <div class="mt-2 text-gray-400 text-xs">
                <code>{input1:xxx}</code>
                <code>{output1:xxx}</code>
                分别代表第1个输入文件和第1个输出文件，xxx为文件扩展名，如mp4、mp3等
            </div>
        </div>
    </div>
</template>
