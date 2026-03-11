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
    }

    stop() {
        BdApi.Logger.log(this.meta.name, "Plugin stopped");
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
                { key: "activity", label: "Block Activity Status" }
            ] }
        ];

        toggles.forEach(section => {
            const sectionDiv = document.createElement("div");
            sectionDiv.style.cssText = "margin-bottom: 15px; padding: 10px; border: 1px solid var(--background-tertiary); border-radius: 4px;";

            const title = document.createElement("div");
            title.style.cssText = "font-weight: 600; margin-bottom: 10px;";
            title.textContent = "Tracker Blocking";
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

    // Sentry 오류 보고 차단
    patchSentry() {
        const sentryClient = BdApi.Webpack.getModule(m => m?.captureException && m?.captureEvent);
        if (sentryClient) {
            BdApi.Patcher.instead(this.meta.name, sentryClient, "captureException", () => { });
            BdApi.Patcher.instead(this.meta.name, sentryClient, "captureEvent", () => { });
            BdApi.Patcher.instead(this.meta.name, sentryClient, "captureMessage", () => { });
        }

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
                activity: false
            }
        };
        this.current = Object.assign(structuredClone(this.defaultSettings), BdApi.Data.load(name, "settings") || {});
    }

    save() {
        BdApi.Data.save(this.name, "settings", this.current);
    }
}
