import express from "express";
import type { Request, Response } from "express";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ipcMain } from "electron";
import { Log } from "../log/main";
import ConfigMain from "../config/main";
import StorageMain from "../storage/main";
import { Events } from "../event/main";
import { DBMain } from "../db/main";
import { AppEnv } from "../env";
import docHtml from "./doc.html?raw";

let server: http.Server | null = null;
let isRunning = false;
let runningPort = 0;
let runningToken = "";

const getAvailablePort = (): Promise<number> => {
    return new Promise((resolve, reject) => {
        const s = http.createServer();
        s.listen(0, "127.0.0.1", () => {
            const addr = s.address() as { port: number };
            const port = addr.port;
            s.close(() => resolve(port));
        });
        s.on("error", reject);
    });
};

const generateToken = (): string => {
    return (
        crypto.randomUUID().replace(/-/g, "") +
        crypto.randomUUID().replace(/-/g, "")
    );
};

const writeCliAuthFile = (port: number, token: string): void => {
    try {
        const filePath = path.join(AppEnv.userData, "cli-auth.json");
        fs.writeFileSync(filePath, JSON.stringify({ port, token }), "utf-8");
    } catch (e) {
        Log.error("httpserver.writeCliAuthFile.error", e);
    }
};

const functionArgsMap: Record<string, string[]> = {
    soundTts: ["text"],
    soundClone: ["text", "promptAudio", "promptText"],
    videoGen: ["video", "audio"],
    asr: ["audio"],
    textToImage: ["prompt"],
    imageToImage: ["image", "prompt"],
    live: [],
};

const functionBizMap: Record<string, string> = {
    soundTts: "SoundGenerate",
    soundClone: "SoundGenerate",
    videoGen: "VideoGen",
    asr: "SoundAsr",
    textToImage: "TextToImage",
    imageToImage: "ImageToImage",
};

const getInstalledServers = async () => {
    const storageData = await StorageMain.read("server", null);
    const records = storageData?.records || [];
    return records
        .filter((r: any) => r.name && r.version)
        .map((r: any) => ({
            id: `${r.name}|${r.version}`,
            name: r.name,
            version: r.version,
            title: r.title || r.name,
            functions: (r.functions || []).map((funcName: string) => ({
                name: funcName,
                args: functionArgsMap[funcName] || [],
                param: r.config?.functions?.[funcName]?.param || [],
            })),
        }));
};

const getServerRecord = async (serverName: string, serverVersion: string) => {
    const storageData = await StorageMain.read("server", null);
    const records = storageData?.records || [];
    return records.find(
        (r: any) => r.name === serverName && r.version === serverVersion,
    );
};

const buildModelConfig = (
    funcName: string,
    serverName: string,
    serverTitle: string,
    serverVersion: string,
    param: any,
) => {
    switch (funcName) {
        case "soundTts":
            return {
                type: "SoundTts",
                ttsServerKey: `${serverName}|${serverVersion}`,
                ttsParam: param?.param || {},
                text: param?.text || "",
            };
        case "soundClone":
            return {
                type: "SoundClone",
                cloneServerKey: `${serverName}|${serverVersion}`,
                cloneParam: param?.param || {},
                text: param?.text || "",
                promptUrl: param?.promptAudio || "",
                promptText: param?.promptText || "",
            };
        case "videoGen":
            return {
                soundType: "soundCustom",
                soundCustomFile: param?.audio || "",
                videoTemplateUrl: param?.video || "",
            };
        case "asr":
            return {
                audio: param?.audio || "",
            };
        case "textToImage":
            return {
                prompt: param?.prompt || "",
                textToImage: {
                    serverName,
                    serverTitle,
                    serverVersion,
                    type: "TextToImage",
                    serverKey: `${serverName}|${serverVersion}`,
                    param: param?.param || {},
                },
            };
        case "imageToImage":
            return {
                image: param?.image || "",
                prompt: param?.prompt || "",
                imageToImage: {
                    serverName,
                    serverTitle,
                    serverVersion,
                    type: "ImageToImage",
                    serverKey: `${serverName}|${serverVersion}`,
                    param: param?.param || {},
                },
            };
        default:
            return param || {};
    }
};

const buildTaskParam = (funcName: string, param: any) => {
    if (funcName === "videoGen" || funcName === "asr") {
        return param?.param || {};
    }
    return {};
};

const buildTaskTitle = (funcName: string, param: any): string => {
    switch (funcName) {
        case "soundTts":
            return param?.text ? String(param.text).slice(0, 20) : "TTS任务";
        case "soundClone":
            return param?.text
                ? String(param.text).slice(0, 20)
                : "音色克隆任务";
        case "videoGen":
            return "AI数字人视频";
        case "asr":
            return "ASR识别任务";
        case "textToImage":
            return param?.prompt
                ? String(param.prompt).slice(0, 20)
                : "文生图任务";
        case "imageToImage":
            return param?.prompt
                ? String(param.prompt).slice(0, 20)
                : "图生图任务";
        default:
            return "任务";
    }
};

const sendJson = (res: Response, statusCode: number, data: any) => {
    res.status(statusCode).json(data);
};

const createApp = (port: number, token: string) => {
    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization",
        );
        if (_req.method === "OPTIONS") {
            res.status(200).end();
            return;
        }
        next();
    });

    app.get("/doc", (_req, res) => {
        const html = docHtml.replace(/\{\{PORT\}\}/g, String(port));
        res.status(200)
            .set("Content-Type", "text/html; charset=utf-8")
            .send(html);
    });

    app.use((_req, res, next) => {
        const auth = _req.headers["authorization"] || "";
        if (!auth.startsWith("Bearer ") || auth.slice(7) !== token) {
            sendJson(res, 401, { code: -1, msg: "Unauthorized" });
            return;
        }
        next();
    });

    app.post("/api/model/list", async (_req, res) => {
        try {
            const servers = await getInstalledServers();
            sendJson(res, 200, { code: 0, data: servers });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: String(e) });
        }
    });

    app.post("/api/model/call", async (req, res) => {
        try {
            const {
                model,
                version,
                function: funcName,
                param,
            } = req.body || {};
            let serverName: string;
            let serverVersion: string;
            if (version !== undefined) {
                // 新格式：model 和 version 分别传递
                serverName = model || "";
                serverVersion = version || "";
            } else {
                // 兼容旧格式：model 为 "name|version"
                const parts = (model || "").split("|");
                serverName = parts[0];
                serverVersion = parts.slice(1).join("|");
            }
            if (!serverName || !serverVersion) {
                sendJson(res, 400, {
                    code: -1,
                    msg: "Missing model or version",
                });
                return;
            }
            if (!funcName) {
                sendJson(res, 400, { code: -1, msg: "Missing function" });
                return;
            }
            const biz = functionBizMap[funcName];
            if (!biz) {
                sendJson(res, 400, {
                    code: -1,
                    msg: `Unknown function: ${funcName}`,
                });
                return;
            }
            const serverRecord = await getServerRecord(
                serverName,
                serverVersion,
            );
            if (!serverRecord) {
                sendJson(res, 400, {
                    code: -1,
                    msg: `Server not found: ${serverName}|${serverVersion}`,
                });
                return;
            }
            const serverTitle = serverRecord.title || serverName;
            const modelConfig = buildModelConfig(
                funcName,
                serverName,
                serverTitle,
                serverVersion,
                param,
            );
            const taskParam = buildTaskParam(funcName, param);
            const title = buildTaskTitle(funcName, param);
            const taskDbId = await DBMain.insert(
                `INSERT INTO data_task (biz, title, status, startTime, serverName, serverTitle, serverVersion, param, jobResult, modelConfig, result, type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    biz,
                    title,
                    "queue",
                    Date.now(),
                    serverName,
                    serverTitle,
                    serverVersion,
                    JSON.stringify(taskParam),
                    JSON.stringify({}),
                    JSON.stringify(modelConfig),
                    JSON.stringify({}),
                    1,
                ],
            );
            const taskId = String(taskDbId);
            sendJson(res, 200, { code: 0, data: { taskId } });
            Events.callPage("main", "httpserver:submitTask", {
                biz,
                taskId,
            }).catch((err) => {
                Log.error("httpserver.submitTask.error", err);
            });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: `Internal error: ${e}` });
        }
    });

    app.post("/api/model/query", async (req, res) => {
        try {
            const { taskId } = req.body || {};
            if (!taskId) {
                sendJson(res, 400, { code: -1, msg: "Missing taskId" });
                return;
            }
            const LONG_POLL_MS = 60_000;
            const POLL_INTERVAL_MS = 500;
            const deadline = Date.now() + LONG_POLL_MS;
            const queryOnce = async () => {
                const record = await DBMain.first(
                    "SELECT * FROM data_task WHERE id = ?",
                    [taskId],
                );
                if (!record) {
                    return {
                        done: true,
                        payload: {
                            code: 0,
                            data: { status: "error", error: "Task not found" },
                        },
                    };
                }
                if (record.status === "success") {
                    let result: any = null;
                    try {
                        const parsed = JSON.parse(record.result);
                        if (parsed && Object.keys(parsed).length > 0)
                            result = parsed;
                    } catch (_) {}
                    if (result) {
                        return {
                            done: true,
                            payload: {
                                code: 0,
                                data: {
                                    status: "success",
                                    result: {
                                        code: 0,
                                        msg: "ok",
                                        data: {
                                            type: "success",
                                            start: record.startTime || 0,
                                            end: record.endTime || 0,
                                            data: result,
                                        },
                                    },
                                },
                            },
                        };
                    }
                } else if (record.status === "fail") {
                    return {
                        done: true,
                        payload: {
                            code: 0,
                            data: {
                                status: "error",
                                error: record.statusMsg || "Task failed",
                            },
                        },
                    };
                } else if (record.status === "pause") {
                    let jobResult: any = null;
                    try {
                        jobResult = JSON.parse(record.jobResult);
                    } catch (_) {}
                    return {
                        done: true,
                        payload: {
                            code: 0,
                            data: {
                                status: "pause",
                                taskId: String(record.id),
                                step: jobResult?.step || null,
                                statusMsg: record.statusMsg || "Task paused",
                            },
                        },
                    };
                }
                return { done: false, payload: null };
            };
            while (true) {
                const { done, payload } = await queryOnce();
                if (done) {
                    sendJson(res, 200, payload!);
                    return;
                }
                if (Date.now() >= deadline) break;
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            }
            sendJson(res, 200, { code: 0, data: { status: "pending" } });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: `Internal error: ${e}` });
        }
    });

    // ── GET /api/workflow/list ───────────────────────────────────────────
    app.get("/api/workflow/list", async (_req, res) => {
        try {
            const rows = await DBMain.select(
                "SELECT id, name, createdAt, updatedAt FROM workflow ORDER BY createdAt DESC",
                [],
            );
            sendJson(res, 200, { code: 0, data: { list: rows } });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: `Internal error: ${e}` });
        }
    });

    // ── POST /api/workflow/run-named ─────────────────────────────────────
    // 运行已存在的工作流（按名称查找），创建运行记录并执行
    app.post("/api/workflow/run-named", async (req, res) => {
        try {
            const { name } = req.body || {};
            if (!name) {
                sendJson(res, 400, { code: -1, msg: "Missing name" });
                return;
            }
            const wf = await DBMain.first(
                "SELECT * FROM workflow WHERE name = ? ORDER BY createdAt DESC LIMIT 1",
                [name],
            );
            if (!wf) {
                sendJson(res, 404, {
                    code: -1,
                    msg: `Workflow not found: ${name}`,
                });
                return;
            }
            let workflowData: any;
            try {
                workflowData = JSON.parse(wf.data);
            } catch {
                workflowData = {};
            }
            workflowData.status = "idle";
            const now = Math.floor(Date.now() / 1000);
            const workflowLogId = await DBMain.insert(
                `INSERT INTO workflow_log (createdAt, updatedAt, workflowId, name, data, status, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    now,
                    now,
                    wf.id,
                    name,
                    JSON.stringify(workflowData),
                    "idle",
                    Date.now(),
                    0,
                ],
            );
            sendJson(res, 200, {
                code: 0,
                data: {
                    workflowLogId: String(workflowLogId),
                    workflowId: String(wf.id),
                },
            });
            Events.callPage("main", "httpserver:submitWorkflow", {
                workflowLogId: String(workflowLogId),
            }).catch((err) => {
                Log.error("httpserver.submitWorkflow.error", err);
            });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: `Internal error: ${e}` });
        }
    });

    // ── POST /api/workflow/cleanup-test ──────────────────────────────────
    // 删除所有 _test_ 前缀及"新建工作流"命名的工作流及其运行记录
    app.post("/api/workflow/cleanup-test", async (_req, res) => {
        try {
            const testWorkflows = await DBMain.select(
                `SELECT id FROM workflow WHERE name LIKE '_test_%' OR name = '新建工作流'`,
                [],
            );
            for (const wf of testWorkflows) {
                await DBMain.execute(
                    "DELETE FROM workflow_log WHERE workflowId = ?",
                    [wf.id],
                );
                await DBMain.execute("DELETE FROM workflow WHERE id = ?", [
                    wf.id,
                ]);
            }
            sendJson(res, 200, {
                code: 0,
                data: { deleted: testWorkflows.length },
            });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: `Internal error: ${e}` });
        }
    });

    // ── POST /api/workflow/run ───────────────────────────────────────────
    app.post("/api/workflow/run", async (req, res) => {
        try {
            const { data: workflowData } = req.body || {};
            if (!workflowData || !Array.isArray(workflowData.nodes)) {
                sendJson(res, 400, { code: -1, msg: "Missing workflow data" });
                return;
            }
            const now = Math.floor(Date.now() / 1000);
            const workflowId = await DBMain.insert(
                `INSERT INTO workflow (createdAt, updatedAt, name, data) VALUES (?, ?, ?, ?)`,
                [now, now, "_test_" + now, JSON.stringify(workflowData)],
            );
            workflowData.status = "idle";
            const workflowLogId = await DBMain.insert(
                `INSERT INTO workflow_log (createdAt, updatedAt, workflowId, name, data, status, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    now,
                    now,
                    workflowId,
                    "_test_" + now,
                    JSON.stringify(workflowData),
                    "idle",
                    Date.now(),
                    0,
                ],
            );
            sendJson(res, 200, {
                code: 0,
                data: {
                    workflowLogId: String(workflowLogId),
                    workflowId: String(workflowId),
                },
            });
            Events.callPage("main", "httpserver:submitWorkflow", {
                workflowLogId: String(workflowLogId),
            }).catch((err) => {
                Log.error("httpserver.submitWorkflow.error", err);
            });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: `Internal error: ${e}` });
        }
    });

    // ── POST /api/workflow/query ─────────────────────────────────────────
    app.post("/api/workflow/query", async (req, res) => {
        try {
            const { workflowLogId } = req.body || {};
            if (!workflowLogId) {
                sendJson(res, 400, { code: -1, msg: "Missing workflowLogId" });
                return;
            }
            const LONG_POLL_MS = 10_000;
            const POLL_INTERVAL_MS = 500;
            const deadline = Date.now() + LONG_POLL_MS;
            while (true) {
                const record = await DBMain.first(
                    "SELECT * FROM workflow_log WHERE id = ?",
                    [workflowLogId],
                );
                if (!record) {
                    sendJson(res, 200, {
                        code: 0,
                        data: { status: "error", statusMsg: "Not found" },
                    });
                    return;
                }
                if (
                    record.status === "success" ||
                    record.status === "error" ||
                    record.status === "pause"
                ) {
                    let logData: any = null;
                    try {
                        logData = JSON.parse(record.data);
                    } catch {}
                    sendJson(res, 200, {
                        code: 0,
                        data: {
                            status: record.status,
                            statusMsg: record.statusMsg,
                            logData,
                        },
                    });
                    return;
                }
                if (Date.now() >= deadline) break;
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            }
            sendJson(res, 200, { code: 0, data: { status: "pending" } });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: `Internal error: ${e}` });
        }
    });

    // ── POST /api/task/submit ────────────────────────────────────────────
    app.post("/api/task/submit", async (req, res) => {
        try {
            const { biz, modelConfig, param, title } = req.body || {};
            if (!biz) {
                sendJson(res, 400, { code: -1, msg: "Missing biz" });
                return;
            }
            const taskTitle = title || biz + "-task";
            const taskDbId = await DBMain.insert(
                `INSERT INTO data_task (biz, title, status, startTime, serverName, serverTitle, serverVersion, param, jobResult, modelConfig, result, type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    biz,
                    taskTitle,
                    "queue",
                    Date.now(),
                    "",
                    "",
                    "",
                    JSON.stringify(param || {}),
                    JSON.stringify({}),
                    JSON.stringify(modelConfig || {}),
                    JSON.stringify({}),
                    1,
                ],
            );
            const taskId = String(taskDbId);
            sendJson(res, 200, { code: 0, data: { taskId } });
            Events.callPage("main", "httpserver:submitTask", {
                biz,
                taskId,
            }).catch((err) => {
                Log.error("httpserver.submitTask.error", err);
            });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: `Internal error: ${e}` });
        }
    });

    // ── POST /api/task/continue ──────────────────────────────────────────
    // Continue a paused task with stage-specific data.
    // Body: { taskId, stage, data }
    // stage: the current paused step (e.g. "Config", "Confirm")
    // data: the stage-specific payload (e.g. { times: [...] })
    app.post("/api/task/continue", async (req, res) => {
        try {
            const { taskId, stage, data } = req.body || {};
            if (!taskId || !stage) {
                sendJson(res, 400, {
                    code: -1,
                    msg: "Missing taskId or stage",
                });
                return;
            }
            const record = await DBMain.first(
                "SELECT * FROM data_task WHERE id = ?",
                [taskId],
            );
            if (!record) {
                sendJson(res, 200, {
                    code: -1,
                    msg: `Task not found: ${taskId}`,
                });
                return;
            }
            if (record.status !== "pause") {
                sendJson(res, 200, {
                    code: -1,
                    msg: `Task is not paused (current status: ${record.status})`,
                });
                return;
            }
            // Map stage → next step
            const stageTransitions: Record<string, Record<string, string>> = {
                VideoZoom: { Config: "Render", RenderConfirm: "End" },
                VideoMark: { Config: "Render", RenderConfirm: "End" },
                VideoSpeedPart: { Config: "Render" },
                VideoKeepPart: { Config: "Render" },
                VideoQuickCut: { Confirm: "Merge" },
            };
            const biz = record.biz;
            const transitions = stageTransitions[biz] || {};
            const nextStep = transitions[stage];
            if (!nextStep) {
                sendJson(res, 200, {
                    code: -1,
                    msg: `Unknown stage "${stage}" for biz "${biz}"`,
                });
                return;
            }
            // Merge jobResult update
            let currentJobResult: any = {};
            try {
                currentJobResult = JSON.parse(record.jobResult) || {};
            } catch (_) {}
            const updatedJobResult = {
                ...currentJobResult,
                step: nextStep,
                [stage]: {
                    ...((currentJobResult[stage] as any) || {}),
                    ...(data || {}),
                },
            };
            await DBMain.execute(
                "UPDATE data_task SET status = ?, jobResult = ?, statusMsg = ? WHERE id = ?",
                ["queue", JSON.stringify(updatedJobResult), "", taskId],
            );
            sendJson(res, 200, { code: 0, data: { taskId } });
            Events.callPage("main", "httpserver:submitTask", {
                biz,
                taskId,
            }).catch((err) => {
                Log.error("httpserver.continueTask.error", err);
            });
        } catch (e) {
            sendJson(res, 500, { code: -1, msg: `Internal error: ${e}` });
        }
    });

    app.use((_req, res) => {
        sendJson(res, 404, { code: -1, msg: "Not found" });
    });

    return app;
};

const start = async (port?: number): Promise<void> => {
    if (isRunning) {
        await stop();
    }
    const resolvedPort = port || (await getAvailablePort());
    const token = generateToken();
    return new Promise((resolve, reject) => {
        const app = createApp(resolvedPort, token);
        const s = http.createServer(app);
        s.listen(resolvedPort, "127.0.0.1", async () => {
            server = s;
            isRunning = true;
            runningPort = resolvedPort;
            runningToken = token;
            await ConfigMain.set("httpServerPort", resolvedPort);
            await ConfigMain.set("httpServerToken", token);
            writeCliAuthFile(resolvedPort, token);
            Log.info("httpserver.start", { port: resolvedPort });
            resolve();
        });
        s.on("error", (err: any) => {
            Log.error("httpserver.error", err);
            reject(err);
        });
    });
};

const stop = async (): Promise<void> => {
    return new Promise((resolve) => {
        if (!server) {
            isRunning = false;
            runningPort = 0;
            resolve();
            return;
        }
        server.close(() => {
            server = null;
            isRunning = false;
            runningPort = 0;
            resolve();
        });
    });
};

const status = () => ({
    running: isRunning,
    port: runningPort,
});

ipcMain.handle("httpserver:status", async () => {
    return status();
});

ipcMain.handle("httpserver:start", async (_, port?: number) => {
    try {
        await start(port);
        return { code: 0 };
    } catch (e) {
        return { code: -1, msg: String(e) };
    }
});

ipcMain.handle("httpserver:stop", async () => {
    await stop();
    return { code: 0 };
});

export const HttpServerMain = {
    start,
    stop,
    status,
};

export default HttpServerMain;
