/**
 * @name BlockTrack
 * @author dededed6
 * @version 1.0.0
 * @description Block Discord tracking and analytics events
 * @website https://github.com/dededed6/BetterDiscordPlugins
 * @source https://raw.githubusercontent.com/dededed6/BetterDiscordPlugins/master/Plugins/BlockTrack/BlockTrack.plugin.js
 */

module.exports = class BlockTrack {
    constructor(meta) {
        this.meta = meta;
        this.settings = new SettingsManager(meta.name);
        this.patcher = new NativePatcher();
    }

    start() {
        BdApi.Logger.log(this.meta.name, "Plugin started");
        const cfg = this.settings.current;

        if (cfg.blockTracker?.science) this.patchScience();
        if (cfg.blockTracker?.sentry) this.patchSentry();
        if (cfg.blockTracker?.telemetry) this.patchTelemetry();
        if (cfg.blockTracker?.experiments) this.patchExperiments();
        if (cfg.blockTracker?.typing) this.patchTyping();
        if (cfg.blockTracker?.readReceipts) this.patchReadReceipts();
        if (cfg.blockTracker?.activity) this.patchActivity();
        if (cfg.blockTracker?.webSocket) this.patchWebSocket();
        if (cfg.blockTracker?.process && cfg.blockTracker?.repatchProcess) this.startProcessMonitor();
        if (cfg.webRTC?.blockLeaks) this.patchWebRTC();
    }

    stop() {
        BdApi.Logger.log(this.meta.name, "Plugin stopped");
        if (this._processMonitorInterval) {
            clearInterval(this._processMonitorInterval);
            this._processMonitorInterval = null;
        }
        this.patcher.restoreAll();
        BdApi.Patcher.unpatchAll(this.meta.name);
    }

    getSettingsPanel() {
        const container = document.createElement("div");
        container.style.cssText = "color: var(--text-normal); padding: 10px;";

        const settings = this.settings.current;
        const toggles = [
            { section: "blockTracker", items: [
                { key: "science", label: "Block Science/Analytics Events" },
                { key: "sentry", label: "Block Sentry Error Reports" },
                { key: "telemetry", label: "Block Telemetry (Performance)" },
                { key: "experiments", label: "Block A/B Experiments" },
                { key: "typing", label: "Block Typing Indicator" },
                { key: "readReceipts", label: "Block Read Receipts" },
                { key: "activity", label: "Block Activity Status" },
                { key: "webSocket", label: "Filter WebSocket Payloads" },
                { key: "process", label: "Block Process Monitoring" },
                { key: "repatchProcess", label: "Auto-repatch Process Monitor" }
            ] },
            { section: "webRTC", items: [
                { key: "blockLeaks", label: "Block WebRTC IP Leaks" }
            ] }
        ];

        toggles.forEach(section => {
            const sectionDiv = document.createElement("div");
            sectionDiv.style.cssText = "margin-bottom: 15px; padding: 10px; border: 1px solid var(--background-tertiary); border-radius: 4px;";

            const title = document.createElement("div");
            title.style.cssText = "font-weight: 600; margin-bottom: 10px;";
            title.textContent = section.section === "blockTracker" ? "Tracker Blocking" : "WebRTC Protection";
            sectionDiv.appendChild(title);

            section.items.forEach(item => {
                const row = document.createElement("label");
                row.style.cssText = "display: flex; align-items: center; margin: 8px 0; cursor: pointer;";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = settings[section.section][item.key];
                checkbox.style.cssText = "margin-right: 10px; cursor: pointer;";

                checkbox.addEventListener("change", () => {
                    settings[section.section][item.key] = checkbox.checked;
                    this.settings.save();
                    BdApi.Logger.info(this.meta.name, `${item.label}: ${checkbox.checked}`);
                });

                row.appendChild(checkbox);
                row.appendChild(document.createTextNode(item.label));
                sectionDiv.appendChild(row);
            });

            container.appendChild(sectionDiv);
        });

        return container;
    }

    // Science/Analytics 추적 차단
    patchScience() {
        const tracker = BdApi.Webpack.getModule(m => m?.trackWithMetadata && m?.track);
        if (tracker) {
            BdApi.Patcher.instead(this.meta.name, tracker, "track", () => { });
            BdApi.Patcher.instead(this.meta.name, tracker, "trackWithMetadata", () => { });
        }

        const analytics = BdApi.Webpack.getByKeys("AnalyticEventConfigs");
        if (analytics?.default?.track) {
            BdApi.Patcher.instead(this.meta.name, analytics.default, "track", () => { });
        }
    }

    // Sentry 오류 보고 차단 (BdApi.Patcher로만 처리 - 가이드라인 준수)
    patchSentry() {
        // Sentry 클라이언트 캡처 함수 무효화
        const sentryClient = BdApi.Webpack.getModule(m => m?.captureException && m?.captureEvent);
        if (sentryClient) {
            BdApi.Patcher.instead(this.meta.name, sentryClient, "captureException", () => { });
            BdApi.Patcher.instead(this.meta.name, sentryClient, "captureEvent", () => { });
            BdApi.Patcher.instead(this.meta.name, sentryClient, "captureMessage", () => { });
        }

        // Sentry 허브의 캡처 함수 차단
        const hub = BdApi.Webpack.getModule(m => m?.getCurrentHub);
        if (hub) {
            BdApi.Patcher.instead(this.meta.name, hub, "captureException", () => { });
            BdApi.Patcher.instead(this.meta.name, hub, "captureEvent", () => { });
            BdApi.Patcher.instead(this.meta.name, hub, "captureMessage", () => { });
        }
    }

// 원격 분석(성능) 차단
    patchTelemetry() {
        const perf = BdApi.Webpack.getModule(m => m?.markStart && m?.markEnd);
        if (perf) {
            BdApi.Patcher.instead(this.meta.name, perf, "markStart", () => { });
            BdApi.Patcher.instead(this.meta.name, perf, "markEnd", () => { });
            if (perf.submitPerformance) {
                BdApi.Patcher.instead(this.meta.name, perf, "submitPerformance", () => { });
            }
        }
    }

    // A/B 실험 차단
    patchExperiments() {
        const exp = BdApi.Webpack.getModule(m => m?.getExperimentOverrides);
        if (exp) {
            BdApi.Patcher.instead(this.meta.name, exp, "getExperimentOverrides", () => ({}));
        }

        const exposure = BdApi.Webpack.getModule(m => m?.trackExposure);
        if (exposure?.trackExposure) {
            BdApi.Patcher.instead(this.meta.name, exposure, "trackExposure", () => { });
        }
    }

    // 타이핑 표시기 차단
    patchTyping() {
        const typing = BdApi.Webpack.getModule(m => m?.startTyping);
        if (typing?.startTyping) {
            BdApi.Patcher.instead(this.meta.name, typing, "startTyping", () => { });
        }
    }

    // 읽음 표시 차단
    patchReadReceipts() {
        const receipts = BdApi.Webpack.getModule(m => m?.ack && m?.receiveMessage);
        if (receipts?.ack) {
            BdApi.Patcher.instead(this.meta.name, receipts, "ack", () => { });
        }
    }

    // 활동 상태 차단
    patchActivity() {
        const activity = BdApi.Webpack.getModule(m => m?.sendActivityInviteUser);
        if (activity) {
            Object.keys(activity).forEach(key => {
                if (key.includes("send")) {
                    BdApi.Patcher.instead(this.meta.name, activity, key, () => { });
                }
            });
        }

        const status = BdApi.Webpack.getModule(m => m?.getActivities);
        if (status) {
            BdApi.Patcher.instead(this.meta.name, status, "getActivities", () => []);
            BdApi.Patcher.instead(this.meta.name, status, "getPrimaryActivity", () => null);
        }
    }

    // WebSocket 메시지 필터링
    patchWebSocket() {
        const origWS = window.WebSocket;

        const PatchedWebSocket = class extends origWS {
            addEventListener(type, handler) {
                if (type !== "message") return super.addEventListener(type, handler);

                return super.addEventListener(type, (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.op === 0) {
                            // READY: 추적 토큰 제거
                            if (msg.t === "READY" && msg.d?.user) {
                                delete msg.d.user.analytics_token;
                                delete msg.d.user.fingerprint;
                            }
                            // PRESENCE_UPDATE: 활동 상태 제거
                            if (msg.t === "PRESENCE_UPDATE" && msg.d?.activities) {
                                msg.d.activities = [];
                            }
                        }
                        event = new MessageEvent("message", { data: JSON.stringify(msg) });
                    } catch (e) { }
                    handler.call(this, event);
                });
            }

            set onmessage(handler) {
                if (!handler) return super.onmessage = null;
                super.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.op === 0) {
                            if (msg.t === "READY" && msg.d?.user) {
                                delete msg.d.user.analytics_token;
                                delete msg.d.user.fingerprint;
                            }
                            if (msg.t === "PRESENCE_UPDATE" && msg.d?.activities) {
                                msg.d.activities = [];
                            }
                        }
                        event = new MessageEvent("message", { data: JSON.stringify(msg) });
                    } catch (e) { }
                    handler.call(this, event);
                };
            }

            get onmessage() {
                return super.onmessage;
            }
        };

        this.patcher.patchNative(window, "WebSocket", () => PatchedWebSocket);
    }

    // 프로세스 모니터 차단
    startProcessMonitor() {
        const cfg = this.settings.current;
        const applyMonitorPatch = () => {
            const utils = BdApi.Webpack.getByKeys("getDiscordUtils");
            if (!utils) return;

            BdApi.Patcher.instead(this.meta.name, utils, "ensureModule", (_, [name], orig) => {
                if (name?.includes("discord_rpc")) return;
                return orig(name);
            });

            const discord = utils.getDiscordUtils?.();
            if (discord?.setObservedGamesCallback) {
                discord.setObservedGamesCallback([], () => { });
                BdApi.Patcher.instead(this.meta.name, discord, "setObservedGamesCallback", () => { });
            }
        };

        applyMonitorPatch();

        if (cfg.blockTracker?.repatchProcess) {
            this._processMonitorInterval = setInterval(applyMonitorPatch, 5000);
        }
    }

    // WebRTC IP 유출 방지
    patchWebRTC() {
        const origRTC = window.RTCPeerConnection;
        const PatchedRTC = class extends origRTC {
            constructor(config) {
                super({ ...config, iceServers: [] });
            }
        };
        this.patcher.patchNative(window, "RTCPeerConnection", () => PatchedRTC);
    }
};

// 설정 관리
class SettingsManager {
    constructor(name) {
        this.name = name;
        this.defaultSettings = {
            blockTracker: {
                science: true,
                sentry: true,
                telemetry: true,
                experiments: true,
                typing: false,
                readReceipts: false,
                activity: false,
                webSocket: false,
                process: false,
                repatchProcess: true
            },
            webRTC: {
                blockLeaks: true
            }
        };
        this.current = this._merge(structuredClone(this.defaultSettings), BdApi.Data.load(name, "settings") || {});
    }

    _merge(target, source) {
        for (const key in source) {
            if (source[key] instanceof Object && !Array.isArray(source[key])) {
                target[key] = target[key] instanceof Object ? this._merge(target[key], source[key]) : source[key];
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    save() {
        BdApi.Data.save(this.name, "settings", this.current);
    }
}

// 네이티브 패칭 관리
class NativePatcher {
    constructor() {
        this.restorers = [];
    }

    patchNative(obj, prop, factory) {
        if (!obj || !obj[prop]) return;
        const orig = obj[prop];
        const patched = factory(orig);

        try {
            Object.defineProperty(patched, "toString", { get: () => orig.toString.bind(orig) });
        } catch (e) { }

        try {
            obj[prop] = patched;
        } catch (e) {
            try {
                Object.defineProperty(obj, prop, { value: patched, configurable: true, writable: true });
            } catch (e2) {
                return;
            }
        }

        this.restorers.push(() => {
            try {
                obj[prop] = orig;
            } catch (e) {
                try {
                    Object.defineProperty(obj, prop, { value: orig, configurable: true, writable: true });
                } catch (e2) { }
            }
        });
    }

    restoreAll() {
        this.restorers.forEach(restore => {
            try { restore(); } catch (e) { }
        });
        this.restorers = [];
    }
}
