import { ipcRenderer } from "electron";

const status = async (): Promise<{ running: boolean; port: number }> => {
    return ipcRenderer.invoke("httpserver:status");
};

const start = async (
    port?: number,
): Promise<{ code: number; msg?: string }> => {
    return ipcRenderer.invoke("httpserver:start", port);
};

const stop = async (): Promise<{ code: number }> => {
    return ipcRenderer.invoke("httpserver:stop");
};

export default {
    status,
    start,
    stop,
};
