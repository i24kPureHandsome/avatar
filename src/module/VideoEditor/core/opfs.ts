import { file, write } from "opfs-tools";

export async function writeFile(
    id: string,
    stream?: ReadableStream<Uint8Array>,
) {
    if (!stream) {
        stream = await file(id).stream();
        if (!stream) {
            throw new Error("stream is not ready");
        }
    }
    if (!(await file(id).exists())) {
        await write(id, stream);
        stream = await file(id).stream();
    }
    return stream;
}
