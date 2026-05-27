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
                                                    settingKey: "centerX",
                                                    defaultValue: 0,
                                                }),
                                                mappingFormItem("Number", {
                                                    attr: {
                                                        controlsPosition:
                                                            "right",
                                                    },
                                                    name: "y",
                                                    settingKey: "centerY",
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
                        mappingFormItem("Collapse", {
                            children: [
                                mappingFormItem("CollapsePane", {
                                    name: "文字",
                                    children: [
                                        mappingFormItem("Number", {
                                            attr: {
                                                controlsPosition: "right",
                                            },
                                            name: "字号",
                                            settingKey: "fontSize",
                                            defaultValue: 40,
                                        }),
                                        mappingFormItem("TextArea", {
                                            attr: {
                                                autosize: {
                                                    minRows: 1,
                                                    maxRows: 4,
                                                },
                                                placeholder: "请输入内容",
                                            },
                                            name: "内容",
                                            settingKey: "text",
                                            defaultValue: "默认文本",
                                        }),
                                        mappingFormItem("Color", {
                                            name: "颜色",
                                            settingKey: "style.fill",
                                            defaultValue: "#ffffff",
                                        }),
                                        mappingFormItem("Color", {
                                            name: "描边",
                                            settingKey: "style.stroke",
                                        }),
                                        mappingFormItem("Color", {
                                            name: "背景",
                                            settingKey:
                                                "style.textBackgroundColor",
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
