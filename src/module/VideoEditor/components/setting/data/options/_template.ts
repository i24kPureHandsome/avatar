import { mappingFormItem } from "../../../../core/setting/util";
// 元素属性配置
export const Options = {
    attributes: [
        mappingFormItem("Tabs", {
            children: [
                mappingFormItem("TabPane", {
                    name: "画面",
                    children: [
                        mappingFormItem("TabsCard", {
                            children: [
                                mappingFormItem("TabPane", {
                                    name: "基础",
                                    children: [
                                        mappingFormItem("Collapse", {
                                            children: [
                                                mappingFormItem(
                                                    "CollapsePane",
                                                    {
                                                        name: "基础",
                                                        children: [
                                                            mappingFormItem(
                                                                "Slider",
                                                                {
                                                                    attr: {
                                                                        min: 1,
                                                                        max: 100,
                                                                        step: 1,
                                                                    },
                                                                    name: "缩放X",
                                                                    settingKey:
                                                                        "scaleX",
                                                                },
                                                            ),
                                                            mappingFormItem(
                                                                "Flex",
                                                                {
                                                                    attr: {
                                                                        col: 2,
                                                                    },
                                                                    name: "位置",
                                                                    children: [
                                                                        mappingFormItem(
                                                                            "Number",
                                                                            {
                                                                                attr: {
                                                                                    controlsPosition:
                                                                                        "right",
                                                                                },
                                                                                name: "x",
                                                                                settingKey:
                                                                                    "position.x",
                                                                            },
                                                                        ),
                                                                        mappingFormItem(
                                                                            "Number",
                                                                            {
                                                                                attr: {
                                                                                    controlsPosition:
                                                                                        "right",
                                                                                },
                                                                                name: "y",
                                                                                settingKey:
                                                                                    "position.y",
                                                                            },
                                                                        ),
                                                                    ],
                                                                },
                                                            ),
                                                            mappingFormItem(
                                                                "Number",
                                                                {
                                                                    name: "旋转",
                                                                    settingKey:
                                                                        "position",
                                                                },
                                                            ),
                                                            mappingFormItem(
                                                                "Color",
                                                                {
                                                                    name: "背景颜色",
                                                                    settingKey:
                                                                        "color",
                                                                },
                                                            ),
                                                            mappingFormItem(
                                                                "TextArea",
                                                                {
                                                                    attr: {
                                                                        autosize:
                                                                            {
                                                                                minRows: 1,
                                                                                maxRows: 4,
                                                                            },
                                                                        placeholder:
                                                                            "请输入",
                                                                    },
                                                                    name: "文字",
                                                                    settingKey:
                                                                        "color1",
                                                                },
                                                            ),
                                                            mappingFormItem(
                                                                "Boolean",
                                                                {
                                                                    name: "switch",
                                                                    settingKey:
                                                                        "color2",
                                                                },
                                                            ),
                                                            mappingFormItem(
                                                                "String",
                                                                {
                                                                    attr: {
                                                                        placeholder:
                                                                            "请输入数字",
                                                                    },
                                                                    name: "string",
                                                                    settingKey:
                                                                        "color3",
                                                                },
                                                            ),
                                                            mappingFormItem(
                                                                "Radio",
                                                                {
                                                                    name: "Radio",
                                                                    settingKey:
                                                                        "color4",
                                                                    defaultValue:
                                                                        "o1",
                                                                    children: [
                                                                        mappingFormItem(
                                                                            "RadioItem",
                                                                            {
                                                                                name: "o1",
                                                                                value: "o1",
                                                                            },
                                                                        ),
                                                                        mappingFormItem(
                                                                            "RadioItem",
                                                                            {
                                                                                name: "o2",
                                                                                value: "o2",
                                                                            },
                                                                        ),
                                                                    ],
                                                                },
                                                            ),
                                                            mappingFormItem(
                                                                "RadioButton",
                                                                {
                                                                    name: "Radio",
                                                                    settingKey:
                                                                        "color5",
                                                                    defaultValue:
                                                                        "o1",
                                                                    children: [
                                                                        mappingFormItem(
                                                                            "RadioButtonItem",
                                                                            {
                                                                                name: "o1",
                                                                                value: "o1",
                                                                            },
                                                                        ),
                                                                        mappingFormItem(
                                                                            "RadioButtonItem",
                                                                            {
                                                                                name: "o2",
                                                                                value: "o2",
                                                                            },
                                                                        ),
                                                                    ],
                                                                },
                                                            ),
                                                        ],
                                                    },
                                                ),
                                            ],
                                        }),
                                        mappingFormItem("Collapse", {
                                            children: [
                                                mappingFormItem(
                                                    "CollapsePane",
                                                    {
                                                        name: "混合",
                                                        children: [
                                                            mappingFormItem(
                                                                "Slider",
                                                                {
                                                                    name: "透明度",
                                                                    settingKey:
                                                                        "opacity",
                                                                },
                                                            ),
                                                        ],
                                                    },
                                                ),
                                            ],
                                        }),
                                    ],
                                }),
                                mappingFormItem("TabPane", {
                                    name: "背景",
                                    children: [
                                        mappingFormItem("FormItem", {
                                            name: "透明度",
                                            dataType: "Slider",
                                            settingKey: "opacity",
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
