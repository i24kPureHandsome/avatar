<script setup lang="ts">
import { nextTick, ref, computed } from "vue";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";
import { TimeUtil } from "../../../../lib/util";
import { TextCutVideoSegment } from "../type";

type EditSegment = TextCutVideoSegment & {
    startSeconds: number;
    endSeconds: number;
};

const props = defineProps({
    saveTitle: {
        type: String,
        default: () => t("common.save"),
    },
});

const emit = defineEmits<{
    save: [
        taskId: number,
        records: TextCutVideoSegment[],
        exportMode: "merge" | "separate",
    ];
}>();

const visible = ref(false);
const currentTaskId = ref<number>(0);
const currentVideo = ref<string>("");
const currentDuration = ref<number>(0);
const currentRecords = ref<EditSegment[]>([]);
const currentIndex = ref<number>(-1);
const searchKeyword = ref("");
const exportMode = ref<"merge" | "separate">("merge");
const videoRef = ref<HTMLVideoElement | null>(null);

const filteredRecords = computed(() => {
    if (!searchKeyword.value.trim()) {
        return currentRecords.value.map((record, index) => ({
            record,
            index,
            matched: false,
        }));
    }
    const keyword = searchKeyword.value.trim().toLowerCase();
    return currentRecords.value.map((record, index) => ({
        record,
        index,
        matched: record.text.toLowerCase().includes(keyword),
    }));
});

const includeCount = computed(() =>
    currentRecords.value.filter((seg) => seg.include).length,
);
const totalCount = computed(() => currentRecords.value.length);

const edit = (
    taskId: number,
    video: string,
    duration: number,
    records: TextCutVideoSegment[],
    mode: "merge" | "separate",
) => {
    currentTaskId.value = taskId || 0;
    currentVideo.value = `file://${video}`;
    currentDuration.value = duration || 0;
    currentIndex.value = -1;
    searchKeyword.value = "";
    exportMode.value = mode || "merge";
    currentRecords.value = records.map((record) => ({
        ...record,
        startSeconds: record.start / 1000,
        endSeconds: record.end / 1000,
    }));
    visible.value = true;
};

defineExpose({
    edit,
});

const doSave = () => {
    const includeCountVal = currentRecords.value.filter(
        (seg) => seg.include,
    ).length;
    if (includeCountVal === 0) {
        Dialog.tipError(t("error.noSegmentSelected"));
        return;
    }
    const finalRecords = currentRecords.value.map((record) => ({
        start: record.start,
        end: record.end,
        text: record.text,
        include: record.include,
    }));
    emit("save", currentTaskId.value, finalRecords, exportMode.value);
    visible.value = false;
};

const doCancel = () => {
    visible.value = false;
    currentRecords.value = [];
    currentIndex.value = -1;
};

const onTimeUpdate = () => {
    const currentTime = videoRef.value?.currentTime || 0;
    const newIndex = currentRecords.value.findIndex(
        (record) =>
            record.startSeconds <= currentTime &&
            currentTime < record.endSeconds,
    );
    if (newIndex !== currentIndex.value) {
        currentIndex.value = newIndex;
        if (newIndex !== -1) {
            nextTick(() => {
                const el = document.querySelector(
                    `[data-segment-index='${newIndex}']`,
                ) as HTMLElement;
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            });
        }
    }
};

const onTimestampClick = (record: EditSegment) => {
    if (videoRef.value) {
        videoRef.value.currentTime = record.startSeconds;
        videoRef.value.play();
    }
};

const onTextClick = (record: EditSegment) => {
    record.include = !record.include;
};

const onToggleAll = (includeAll: boolean) => {
    currentRecords.value.forEach((segment) => {
        segment.include = includeAll;
    });
};

const onInvertSelection = () => {
    currentRecords.value.forEach((segment) => {
        segment.include = !segment.include;
    });
};
</script>

<template>
    <a-modal v-model:visible="visible" width="95vw" title-align="start">
        <template #title>{{ $t("common.manualEditSegment") }}</template>
        <template #footer>
            <a-button @click="doCancel">{{ $t("common.cancel") }}</a-button>
            <a-button type="primary" @click="doSave">{{
                props.saveTitle
            }}</a-button>
        </template>
        <div
            v-if="visible"
            class="flex gap-2 h-full -mx-4 -my-5"
            style="height: calc(100vh - 15rem)"
        >
            <div class="w-1/2 flex flex-col">
                <div
                    class="bg-gray-100 p-2 border-b rounded-lg flex items-center"
                >
                    <div class="text-sm font-medium text-gray-700 flex-grow">
                        {{ $t("common.preview") }}
                    </div>
                </div>
                <div class="flex-grow rounded-lg border p-1">
                    <video
                        ref="videoRef"
                        :src="currentVideo"
                        controls
                        class="w-full h-full bg-black"
                        @timeupdate="onTimeUpdate"
                    ></video>
                </div>
            </div>
            <div class="w-1/2 flex flex-col">
                <div
                    class="bg-gray-100 p-2 border-b rounded-lg flex items-center gap-2"
                >
                    <div class="text-sm font-medium text-gray-700 flex-grow">
                        {{ $t("common.segment") }}
                    </div>
                    <div class="text-xs text-gray-500">
                        {{
                            $t("common.segmentCount", {
                                include: includeCount,
                                total: totalCount,
                            })
                        }}
                    </div>
                </div>
                <div class="p-2 border-b flex items-center gap-2">
                    <a-input
                        v-model="searchKeyword"
                        :placeholder="$t('common.searchText')"
                        allow-clear
                        size="small"
                        class="flex-grow"
                    >
                        <template #prefix>
                            <icon-search />
                        </template>
                    </a-input>
                    <a-button size="mini" @click="onToggleAll(true)">
                        {{ $t("common.selectAll") }}
                    </a-button>
                    <a-button size="mini" @click="onInvertSelection">
                        {{ $t("common.invertSelection") }}
                    </a-button>
                    <a-button size="mini" @click="onToggleAll(false)">
                        {{ $t("common.deSelectAll") }}
                    </a-button>
                </div>
                <div
                    class="flex-grow space-y-1 overflow-y-auto border p-1 rounded-lg"
                >
                    <div
                        v-for="item in filteredRecords"
                        :key="item.index"
                        :data-segment-index="item.index"
                        :class="[
                            'border rounded p-1 hover:shadow mb-1',
                            item.index === currentIndex ? 'bg-blue-50' : '',
                            item.record.include
                                ? 'border-green-200'
                                : 'border-red-200',
                            item.matched === false && searchKeyword.trim()
                                ? 'opacity-40'
                                : '',
                        ]"
                    >
                        <div class="flex items-start">
                            <div class="flex-grow">
                                <div class="flex items-center">
                                    <div
                                        class="text-xs text-gray-600 font-mono select-none cursor-pointer hover:text-blue-600 hover:underline"
                                        @click="
                                            onTimestampClick(item.record)
                                        "
                                    >
                                        {{
                                            TimeUtil.secondsToTime(
                                                item.record.startSeconds,
                                                true,
                                            )
                                        }}
                                        -
                                        {{
                                            TimeUtil.secondsToTime(
                                                item.record.endSeconds,
                                                true,
                                            )
                                        }}
                                    </div>
                                    <div class="flex-grow"></div>
                                    <a-tag
                                        :color="
                                            item.record.include
                                                ? 'green'
                                                : 'red'
                                        "
                                        size="small"
                                    >
                                        {{
                                            item.record.include
                                                ? $t("common.include")
                                                : $t("common.exclude")
                                        }}
                                    </a-tag>
                                </div>
                                <div
                                    class="text-xs pt-1 cursor-pointer select-none"
                                    @click="onTextClick(item.record)"
                                >
                                    {{
                                        item.record.text ||
                                        $t("common.emptySegment")
                                    }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="p-2 border-t flex items-center gap-4">
                    <div class="text-sm text-gray-600">
                        {{ $t("common.exportMode") }}:
                    </div>
                    <a-radio-group v-model="exportMode" size="small">
                        <a-radio value="merge">
                            {{ $t("common.mergeToOneVideo") }}
                        </a-radio>
                        <a-radio value="separate">
                            {{ $t("common.exportSeparately") }}
                        </a-radio>
                    </a-radio-group>
                </div>
            </div>
        </div>
    </a-modal>
</template>
