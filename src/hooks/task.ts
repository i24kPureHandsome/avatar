import { onBeforeUnmount, onMounted } from "vue";
import { TaskBiz } from "../service/TaskService";
import { TaskChangeType, useTaskStore } from "../store/modules/task";
const taskStore = useTaskStore();

export const useTaskChangeRefresh = (
    biz: TaskBiz,
    callback: (bizId: string, type: TaskChangeType) => void,
) => {
    onMounted(async () => {
        taskStore.onChange(biz, callback);
    });
    onBeforeUnmount(() => {
        taskStore.offChange(biz, callback);
    });
};
