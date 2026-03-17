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
            science: true,
            sentry: true,
            experiments: true,
            typing: false,
            readReceipts: false,
            activity: false,
            process: true,
        };
        this.modules = {};
    }

    start() {
        this.settings = Data.load("BlockTrack", "settings") || this.settings;
        this.loadModules();
        this.applyAllPatches();

        this._repatchInterval = setInterval(() => {
            this.applyAllPatches();
        }, 10000);
    }

    stop() {
        if (this._repatchInterval) {
            clearInterval(this._repatchInterval);
        }
        Patcher.unpatchAll("BlockTrack");
    }

    loadModules() {
        if (this.settings.science) {
            this.modules.analytics_track = { module: Webpack.getModule(m => m?.track), methods: { "track": () => {} } };
            this.modules.analytics_metadata = { module: Webpack.getModule(m => m?.trackWithMetadata), methods: { "trackWithMetadata": () => {} } };
            this.modules.metrics = { module: Webpack.getModule(m => m?.increment), methods: { "increment": () => {}, "distribution": () => {} } };
        }
        if (this.settings.sentry) {
            this.modules.sentry_exception = { module: Webpack.getModule(m => m?.captureException), methods: { "captureException": () => {} } };
            this.modules.sentry_message = { module: Webpack.getModule(m => m?.captureMessage), methods: { "captureMessage": () => {} } };
            this.modules.discord_sentry = { module: Webpack.getModule(m => m?.DiscordSentry), methods: { "DiscordSentry": () => ({}) } };
        }
        if (this.settings.experiments) {
            this.modules.experiments_exposure = { module: Webpack.getModule(m => m?.trackExposure), methods: { "trackExposure": () => {} } };
        }
        if (this.settings.typing) {
            this.modules.typing = { module: Webpack.getModule(m => m?.startTyping), methods: { "startTyping": () => {} } };
        }
        if (this.settings.readReceipts) {
            this.modules.readReceipts = { module: Webpack.getModule(m => m?.ack), methods: { "ack": () => {} } };
        }
        if (this.settings.activity) {
            this.modules.activity_send = { module: Webpack.getModule(m => m?.sendActivityInviteUser), methods: { "sendActivityInviteUser": () => {} } };
            this.modules.activity_status = { module: Webpack.getModule(m => m?.getActivities), methods: { "getActivities": () => [], "getPrimaryActivity": () => null } };
        }
        if (this.settings.process) {
            this.modules.running_games = { module: Webpack.getModule(m => m?.getRunningGames), methods: { "getRunningGames": () => [] } };
            this.modules.game_for_pid = { module: Webpack.getModule(m => m?.getGameForPID), methods: { "getGameForPID": () => null } };
            this.modules.running_discord_apps = { module: Webpack.getModule(m => m?.getRunningDiscordApplicationIds), methods: { "getRunningDiscordApplicationIds": () => [] } };
            this.modules.verified_app_ids = { module: Webpack.getModule(m => m?.getRunningVerifiedApplicationIds), methods: { "getRunningVerifiedApplicationIds": () => [] } };
            this.modules.game_events = { module: Webpack.getModule(m => m?.startGameEvents), methods: { "startGameEvents": () => {} } };
            this.modules.observed_games = { module: Webpack.getModule(m => m?.setObservedGamesCallback), methods: { "setObservedGamesCallback": () => {} } };
            this.modules.candidate_games = { module: Webpack.getModule(m => m?.setCandidateGamesCallback), methods: { "setCandidateGamesCallback": () => {} } };
        }
    }

    applyAllPatches() {
        for (const [, config] of Object.entries(this.modules)) {
            if (!config.module) continue;

            Object.entries(config.methods).forEach(([method, returns]) => {
                if (config.module[method]) {
                    Patcher.instead("BlockTrack", config.module, method, returns);
                }
            });
        }
    }

    getSettingsPanel() {
        const container = document.createElement("div");
        container.style.cssText = "color: var(--text-normal); padding: 10px;";

        const items = [
            { key: "science", label: "Block Analytics & Metrics" },
            { key: "sentry", label: "Block Crash Reporting" },
            { key: "experiments", label: "Block A/B Testing" },
            { key: "typing", label: "Block Typing Indicator" },
            { key: "readReceipts", label: "Block Read Receipts" },
            { key: "activity", label: "Block Activity Status" },
            { key: "process", label: "Block Game Detection" }
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
};
