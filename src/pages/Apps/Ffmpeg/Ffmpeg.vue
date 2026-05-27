<script setup lang="ts">
import { onMounted, ref } from "vue";
import TaskBatchDeleteAction from "../../../components/Server/TaskBatchDeleteAction.vue";
import TaskBatchDownloadAction from "../../../components/Server/TaskBatchDownloadAction.vue";
import ToggleButton from "../../../components/common/ToggleButton.vue";
import { useCheckAll } from "../../../components/common/check-all";
import { usePaginate } from "../../../hooks/paginate";
import { useTaskChangeRefresh } from "../../../hooks/task";
import { TaskRecord, TaskService } from "../../../service/TaskService";
import { TaskChangeType } from "../../../store/modules/task";
import Steps from "../common/Steps.vue";
import FfmpegCreate from "./components/FfmpegCreate.vue";
import FfmpegItem from "./components/FfmpegItem.vue";
import ListerTop from "../../../components/common/ListerTop.vue";
import MEmpty from "../../../components/common/MEmpty.vue";
import PageHeader from "../../../components/PageHeader.vue";

const { page, records, recordsForPage } = usePaginate<TaskRecord>({
    pageSize: 10,
});

useTaskChangeRefresh("Ffmpeg", (bizId: string, type: TaskChangeType) => {
    doRefresh();
});

const { mergeCheck, isIndeterminate, isAllChecked, onCheckAll, checkRecords } =
    useCheckAll({
        records: recordsForPage,
    });

const stepsVisible = ref(false);

onMounted(async () => {
    await doRefresh();
});

const doRefresh = async () => {
    const rawRecords = await TaskService.list("Ffmpeg");
    records.value = mergeCheck(rawRecords);
};
</script>

<template>
    <div class="p-5">
        <PageHeader
            title="ffmpeg处理"
            desc="执行自定义FFmpeg命令，支持多文件输入和输出"
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
                    label: '输入文件',
                    description: '选择需要处理的输入文件',
                },
                {
                    key: 2,
                    label: '编写命令',
                    description: '自定义FFmpeg命令参数',
                },
                {
                    key: 3,
                    label: '执行处理',
                    description: '运行FFmpeg命令并生成输出文件',
                },
            ]"
        />
        <div>
            <FfmpegCreate @submitted="doRefresh" />
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
                    <FfmpegItem
                        :record="r"
                        :dialog="false"
                        :on-refresh="doRefresh"
                    />
                </div>
            </div>
            <m-empty v-else />
            <div>
                <FfmpegCreate @submitted="doRefresh" />
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
                        <FfmpegItem
                            :record="r"
                            :dialog="false"
                            :on-refresh="doRefresh"
                        />
                    </div>
                </div>
                <m-empty v-else />
            </div>
        </div>
    </div>
</template>
