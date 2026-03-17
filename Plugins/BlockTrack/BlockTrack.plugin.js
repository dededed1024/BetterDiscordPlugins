/**
 * @name BlockTrack
 * @author dededed6
 * @version 1.2.0
 * @description Block Discord tracking and analytics events (Based on Vencord NoTrack)
 * @website https://github.com/dededed6/BetterDiscordPlugins
 * @source https://raw.githubusercontent.com/dededed6/BetterDiscordPlugins/master/Plugins/BlockTrack/BlockTrack.plugin.js
 */

const { Data, Patcher, Webpack } = BdApi;

module.exports = class BlockTrack {
    constructor() {
        this.settings = {
            trackers: true,
            reports: true,
            status: true,
            process: true,
        };
    }

    start() {
        Object.entries(this.settings).forEach(([setting]) => {
            if (Data.load("BlockTrack", "settings")?.[setting] || this.settings[setting]) {
                patch_cfg[setting].forEach(([target, methodName, returns = ()=>{}]) => {
                    Patcher.instead("BlockTrack", target, methodName, returns);
                });
            }
        });
    }

    stop() { Patcher.unpatchAll("BlockTrack"); }

    getSettingsPanel() {
        const container = document.createElement("div");
        container.style.cssText = "color: var(--text-normal); padding: 10px;";

        const items = [
            { key: "trackers", label: "Block Trackers" },
            { key: "reports", label: "Block Crash Reporting" },
            { key: "status", label: "Block Activity, Keyboard Status" },
            { key: "process", label: "Block Process Detection" }
        ];

        items.forEach(e => {
            const row = document.createElement("label");
            row.style.cssText = "display: flex; align-items: center; margin: 10px 0; cursor: pointer;";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = this.settings[e.key];
            checkbox.style.cssText = "margin-right: 10px; cursor: pointer;";

            checkbox.addEventListener("change", () => {
                this.settings[e.key] = checkbox.checked;
                Data.save("BlockTrack", "settings", this.settings);
            });

            row.appendChild(checkbox);
            row.appendChild(document.createTextNode(e.label));
            container.appendChild(row);
        });

        return container;
    }
}

const Analytics = Webpack.getByKeys("AnalyticEventConfigs")?.default;
const SentryModule = Webpack.getByKeys("captureException");
const ExperimentsModule = Webpack.getByKeys("trackExposure");
const TypingModule = Webpack.getByKeys("startTyping");
const ReadReceiptsModule = Webpack.getByKeys("ack");
const ActivityModule = Webpack.getByKeys("getActivities");
const NativeModule = Webpack.getByKeys("getDiscordUtils");
const DiscordUtils = NativeModule?.getDiscordUtils?.();

const patch_cfg = {
    trackers: [
        [Analytics, "track"],
        [Analytics, "trackMaker"],
        [Analytics, "analyticsTrackingStoreMaker"],
        [Analytics, "getSuperProperties", () => ({})],
        [Analytics, "getSuperPropertiesBase64", () => ""],
        [Analytics, "extendSuperProperties"],
        [Analytics, "expandEventProperties"],
        [Analytics, "encodeProperties"],
        [ExperimentsModule, "trackExposure"],
    ],
    reports: [
        [SentryModule, "captureException"],
        [SentryModule, "captureMessage"],
        [SentryModule, "captureCrash"],
        [SentryModule, "addBreadcrumb"],
        [NativeModule, "submitLiveCrashReport"],
    ],
    status: [
        [TypingModule, "startTyping"],
        [ReadReceiptsModule, "ack"],
        [ActivityModule, "getActivities", () => []],
        [ActivityModule, "getPrimaryActivity", () => null],
    ],
    process: [
        [NativeModule, "setObservedGamesCallback"],
        [NativeModule, "setCandidateGamesCallback"],
        [NativeModule, "setGameDetectionCallback"],
        [NativeModule, "setGameDetectionErrorCallback"],
        [NativeModule, "clearCandidateGamesCallback"],
        [NativeModule, "appViewed"],
        [NativeModule, "appLoaded"],
        [NativeModule, "appFirstRenderAfterReadyPayload"],
        [NativeModule, "ensureModule", (_, [moduleName], original) => { return moduleName === "discord_rpc" ? {} : original(moduleName); }],
        [DiscordUtils, "setObservedGamesCallback2"],
        [DiscordUtils, "startGameEvents"],
        [DiscordUtils, "notifyGameLaunched"],
        [DiscordUtils, "setObserverDebugCallback"],
    ],
}