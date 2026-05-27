<script setup lang="ts">
import { ref } from "vue";
import { t } from "../../../../lang";
import { Dialog } from "../../../../lib/dialog";
import { TimeUtil } from "../../../../lib/util";
import { TaskRecord, TaskService } from "../../../../service/TaskService";
import {
    VideoQuickCutJobResultType,
    VideoQuickCutModelConfigType,
    VideoQuickCutSegment,
} from "../type";

const props = defineProps<{
    record: TaskRecord<
        VideoQuickCutModelConfigType,
        VideoQuickCutJobResultType
    >;
    segments: VideoQuickCutSegment[];
}>();

const emit = defineEmits<{
    update: [];
}>();

const onToggleSegment = async (segment: VideoQuickCutSegment) => {
    segment.include = !segment.include;
    await updateSegments();
};

const onToggleAll = async (includeAll: boolean) => {
    props.segments.forEach((segment) => {
        segment.include = includeAll;
    });
    await updateSegments();
};

const updateSegments = async () => {
    const jobResult = props.record.jobResult;
    if (jobResult && props.record.id) {
        jobResult.Confirm.segments = props.segments;
        await TaskService.update(props.record.id, { jobResult });
        emit("update");
    }
};

const doContinue = async () => {
    const includeCount = props.segments.filter((seg) => seg.include).length;
    if (includeCount === 0) {
        Dialog.tipError(t("error.noSegmentSelected"));
        return;
    }

    await Dialog.confirm(t("msg.confirmSegments", { count: includeCount }));

    const jobResult = props.record.jobResult;
    if (jobResult && props.record.id) {
        jobResult.step = "Merge";
        await TaskService.update(props.record.id, {
            status: "queue",
            jobResult,
        });
        emit("update");
        Dialog.tipSuccess(t("msg.continueEditVideo"));
    }
};

const includeCount = ref(0);
const totalCount = ref(0);

// 计算统计信息
const updateStats = () => {
    includeCount.value = props.segments.filter((seg) => seg.include).length;
    totalCount.value = props.segments.length;
};

// 监听segments变化
const watchSegments = () => {
    updateStats();
};

watchSegments();
</script>

<template>
    <div class="space-y-3">
        <div
            class="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
        >
            <div class="flex items-center gap-4">
                <div class="text-sm text-gray-600">
                    {{
                        $t("common.segmentCount", {
                            include: includeCount,
                            total: totalCount,
                        })
                    }}
                </div>
                <div class="flex gap-2">
                    <a-button size="mini" @click="onToggleAll(true)">
                        {{ $t("common.selectAll") }}
                    </a-button>
                    <a-button size="mini" @click="onToggleAll(false)">
                        {{ $t("common.deSelectAll") }}
                    </a-button>
                </div>
            </div>
            <div>
                <a-button type="primary" size="small" @click="doContinue">
                    <icon-play />
                    {{ $t("common.continueEdit") }}
                </a-button>
            </div>
        </div>

        <div class="max-h-64 overflow-y-auto space-y-2">
            <div
                v-for="(segment, index) in segments"
                :key="index"
                class="flex items-center gap-3 p-2 rounded border"
                :class="
                    segment.include
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                "
            >
                <div class="flex-shrink-0">
                    <a-checkbox
                        :model-value="segment.include"
                        @change="onToggleSegment(segment)"
                        @click="updateStats"
                    />
                </div>
                <div class="flex-shrink-0 w-20 text-xs text-gray-500">
                    <div>{{ TimeUtil.secondsToTime(segment.start) }}</div>
                    <div>{{ TimeUtil.secondsToTime(segment.end) }}</div>
                </div>
                <div class="flex-grow text-sm">
                    {{ segment.text }}
                </div>
                <div class="flex-shrink-0">
                    <a-tag
                        :color="segment.include ? 'green' : 'red'"
                        size="small"
                    >
                        {{
                            segment.include
                                ? $t("common.include")
                                : $t("common.exclude")
                        }}
                    </a-tag>
                </div>
            </div>
        </div>
    </div>
</template>
