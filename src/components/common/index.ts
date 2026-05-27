import MLoading from "./MLoading.vue";
import MEmpty from "./MEmpty.vue";

export { MLoading, MEmpty };

export const CommonComponents = {
    install(_Vue: any) {
        // 组件已移为单独 import 引入，不再全局注册
    },
};
