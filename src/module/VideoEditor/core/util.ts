import { VIDEO_PREVIEW_FIXED_FPS } from "./config";

/**
 *  时间格式化
 * */
export function formatTime(time: number) {
    let second = Math.ceil(time / 1000);
    const s = second % 60;
    second = Math.floor(second / 60);
    const m = second % 60;
    second = Math.floor(second / 60);
    const h = second % 60;
    return {
        s,
        m,
        h,
        str: `${h === 0 ? "" : `${h < 10 ? "0" : ""}${h}:`}${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`,
    };
}

export function formatPlayerTime(frameCount: number) {
    let f = Math.round(frameCount % VIDEO_PREVIEW_FIXED_FPS);
    frameCount = Math.floor(frameCount / VIDEO_PREVIEW_FIXED_FPS);
    let s = frameCount % 60;
    frameCount = Math.floor(frameCount / 60);
    let m = frameCount % 60;
    frameCount = Math.floor(frameCount / 60);
    let h = frameCount;
    return `${h < 10 ? "0" : ""}${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}:${f < 10 ? "0" : ""}${f}`;
}

export function getTextRect({
    text = "Hello World",
    fontSize = 40,
    fontFamily = "Arial",
}: {
    text: string;
    fontSize: number;
    fontFamily?: string;
}) {
    const padding = 4;
    const canvas = new OffscreenCanvas(1000, 1000);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Canvas 2D context is not supported");
    }
    const lines = text.split("\n");
    ctx.font = `${fontSize}px ${fontFamily}`;
    const lineHeight = fontSize * 1.2; // Adjust line height as needed

    // Measure the widest line
    const textWidth = Math.max(
        ...lines.map((line) => ctx.measureText(line).width),
    );

    // Calculate total height
    const totalHeight = lines.length * lineHeight;

    return {
        width: textWidth + padding * 2,
        height: totalHeight + padding * 2,
        lineHeight,
        lines,
    };
}
