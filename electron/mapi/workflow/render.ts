import { ipcRenderer } from "electron";

const dispatch = async (workflowLogId: string, params: any) => {
    return ipcRenderer.invoke("workflow:dispatch", workflowLogId, params);
};

const cancel = async (workflowLogId: string) => {
    return ipcRenderer.invoke("workflow:cancel", workflowLogId);
};

export default { dispatch, cancel };
