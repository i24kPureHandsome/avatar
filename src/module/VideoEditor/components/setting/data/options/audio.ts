import { mappingFormItem } from "../../../../core/setting/util";
// 元素属性配置
export const Options = {
    attributes: [
        mappingFormItem("Tabs", {
            children: [
                // mappingFormItem('TabPane', {
                //     name: '属性',
                //     children: [
                //         mappingFormItem('Collapse', {
                //             children: [
                //                 mappingFormItem('CollapsePane', {
                //                     name: '基础',
                //                     children: [
                //                         mappingFormItem('Boolean', {
                //                             name: '静音',
                //                             settingKey: 'silent',
                //                             defaultValue: false
                //                         })
                //                     ]
                //                 })
                //             ]
                //         })
                //     ]
                // }),
                // mappingFormItem('TabPane', {
                //     name: '动画',
                //     children: []
                // })
            ],
        }),
    ],
};
