<template>
    <div
        v-for="(item, index) in templateList"
        class="item"
        :key="index"
        @click="$emit('addText', item)"
    >
        <!--             <img :src="item" crossorigin="anonymous" alt="">-->
        <div class="text" :style="calcStyle(item)">花字</div>
    </div>
</template>

<script lang="ts" setup>
import { templateList } from "./templateList";
import { computed } from "vue";

const emit = defineEmits({
    addText: (item: any) => true,
});

function calcStyle(item: {
    fill: string;
    stroke?: string;
    textBackgroundColor?: string;
}) {
    const style = { color: item.fill } as any;
    const strokeWidth = 2;
    const strokeColor = item.stroke;
    if (strokeColor) {
        style.textShadow = `-${strokeWidth}px -${strokeWidth}px ${strokeColor}, ${strokeWidth}px -${strokeWidth}px ${strokeColor}, -${strokeWidth}px ${strokeWidth}px ${strokeColor}, ${strokeWidth}px ${strokeWidth}px ${strokeColor}`;
        // style.textStroke = `${strokeWidth}px ${strokeColor}`;
    }
    const backgroundColor = item.textBackgroundColor;
    if (backgroundColor) {
        style.backgroundColor = backgroundColor;
    }
    return style;
}

const style = computed(() => {
    const strokeWidth = 2;
    const strokeColor = "red";
    return {
        textShadow: `-${strokeWidth}px -${strokeWidth}px red, ${strokeWidth}px -${strokeWidth}px red, -${strokeWidth}px ${strokeWidth}px red, ${strokeWidth}px ${strokeWidth}px ${strokeColor}`,
    };
});
</script>

<style lang="less" scoped>
.text {
    display: inline-block;
    font-size: 32px;
    border-radius: 8px;
    padding: 8px;
    line-height: 1;
    font-weight: 800;
}

.item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    width: inherit;
    //height: 105px;
    background: #f4f4f7;
    text-align: center;
    // line-height: 105px;
    font-weight: 500;
    font-size: 16px;
    margin-bottom: 8px;
    cursor: pointer;
    border-radius: 0.5rem;
    padding: 0.5rem;

    &:hover::after {
        content: "";
        position: absolute;
        border-radius: 0.5rem;
        top: 0;
        left: 0;
        z-index: 999;
        display: block;
        width: 100%;
        height: 100%;
        border: 1.5px solid var(--color-primary);
    }
}
</style>
