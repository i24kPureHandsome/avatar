import { mappingFormItem } from "../../../../core/setting/util";
// 元素属性配置
export const Options = {
    attributes: [
        mappingFormItem("Tabs", {
            children: [
                mappingFormItem("TabPane", {
                    name: "属性",
                    children: [
                        mappingFormItem("Collapse", {
                            children: [
                                mappingFormItem("CollapsePane", {
                                    name: "位置",
                                    children: [
                                        mappingFormItem("Flex", {
                                            attr: { col: 2 },
                                            name: "位置",
                                            children: [
                                                mappingFormItem("Number", {
                                                    attr: {
                                                        controlsPosition:
                                                            "right",
                                                    },
                                                    name: "x",
                                                    settingKey: "left",
                                                    defaultValue: 0,
                                                }),
                                                mappingFormItem("Number", {
                                                    attr: {
                                                        controlsPosition:
                                                            "right",
                                                    },
                                                    name: "y",
                                                    settingKey: "top",
                                                    defaultValue: 0,
                                                }),
                                            ],
                                        }),
                                        mappingFormItem("Slider", {
                                            attr: {
                                                min: 1,
                                                max: 200,
                                                step: 1,
                                            },
                                            name: "缩放X",
                                            settingKey: "scaleX",
                                            defaultValue: 100,
                                            label: "%",
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
                mappingFormItem("TabPane", {
                    name: "动画",
                    children: [],
                }),
            ],
        }),
    ],
};
