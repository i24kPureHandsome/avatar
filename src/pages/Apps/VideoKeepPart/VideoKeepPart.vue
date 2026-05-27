<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import TaskBatchDeleteAction from "../../../components/Server/TaskBatchDeleteAction.vue";
import TaskBatchDownloadAction from "../../../components/Server/TaskBatchDownloadAction.vue";
import ToggleButton from "../../../components/common/ToggleButton.vue";
import { useCheckAll } from "../../../components/common/check-all";
import { usePaginate } from "../../../hooks/paginate";
import { useTaskChangeRefresh } from "../../../hooks/task";
import { TaskRecord, TaskService } from "../../../service/TaskService";
import { TaskChangeType, useTaskStore } from "../../../store/modules/task";
import Steps from "../common/Steps.vue";
import VideoKeepPartCreate from "./components/VideoKeepPartCreate.vue";
import VideoKeepPartItem from "./components/VideoKeepPartItem.vue";
import ListerTop from "../../../components/common/ListerTop.vue";
import MEmpty from "../../../components/common/MEmpty.vue";
import PageHeader from "../../../components/PageHeader.vue";

const { page, records, recordsForPage } = usePaginate<TaskRecord>({
    pageSize: 10,
});

useTaskChangeRefresh(
    "VideoKeepPart" as any,
    (bizId: string, type: TaskChangeType) => {
        doRefresh();
    },
);

const { mergeCheck, isIndeterminate, isAllChecked, onCheckAll, checkRecords } =
    useCheckAll({
        records: recordsForPage,
    });

const stepsVisible = ref(false);
const taskStore = useTaskStore();

onMounted(async () => {
    await doRefresh();
});

onUnmounted(() => {});

const doRefresh = async () => {
    const rawRecords = await TaskService.list("VideoKeepPart" as any);
    records.value = mergeCheck(rawRecords);
};
</script>

<template>
    <div class="p-5">
        <PageHeader
            title="视频片段删除/保留"
            desc="选择视频后，选择片段，移除或保留这些片段"
        >
            <template #actions
                ><ToggleButton v-model="stepsVisible"
            /></template>
        </PageHeader>
        <Steps
            v-if="stepsVisible"
            :steps="[
                {
                    key: 1,
                    label: '选择视频',
                    description: '选择需要进行片段处理的视频文件',
                },
                {
                    key: 2,
                    label: '选择片段',
                    description: '在时间轴上选择需要保留或删除的片段',
                },
                {
                    key: 3,
                    label: '生成视频',
                    description: '使用FFmpeg处理视频，生成处理后的视频',
                },
            ]"
        />
        <div>
            <VideoKeepPartCreate @submitted="doRefresh" />
            <ListerTop
                class="mt-4"
                :total="records.length"
                @refresh="doRefresh"
            >
                <a-checkbox
                    :model-value="isAllChecked"
                    :indeterminate="isIndeterminate"
                    @change="onCheckAll"
                >
                    全选
                </a-checkbox>
                <TaskBatchDeleteAction
                    :records="checkRecords"
                    @update="doRefresh"
                />
                <TaskBatchDownloadAction :records="checkRecords" />
                <template #actions>
                    <a-pagination
                        v-model:current="page"
                        :total="records.length"
                        :page-size="10"
                        show-total
                        simple
                    />
                </template>
            </ListerTop>
            <div v-if="records.length > 0">
                <div v-for="r in recordsForPage" :key="r.id">
                    <VideoKeepPartItem
                        :record="r"
                        :dialog="false"
                        :on-refresh="doRefresh"
                    />
                </div>
            </div>
            <m-empty v-else />
        </div>
    </div>
</template>
