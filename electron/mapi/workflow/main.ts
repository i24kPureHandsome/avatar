import { ipcMain } from "electron";
import { AppRuntime } from "../env";
import { StrUtil } from "../../lib/util";

const sendToRenderer = (channel: string, data: any) => {
    if (!AppRuntime.mainWindow) {
        return;
    }
    AppRuntime.mainWindow.webContents.send("MAIN_PROCESS_MESSAGE", {
        id: StrUtil.randomString(32),
        type: "CHANNEL",
        data: { channel, data },
    });
};

ipcMain.handle(
    "workflow:dispatch",
    async (_event, workflowLogId: string, params: any) => {
        sendToRenderer("workflow:execute", { workflowLogId, params });
        return { code: 0 };
    },
);

ipcMain.handle("workflow:cancel", async (_event, workflowLogId: string) => {
    sendToRenderer("workflow:cancel", { workflowLogId });
    return { code: 0 };
});

export default {};
