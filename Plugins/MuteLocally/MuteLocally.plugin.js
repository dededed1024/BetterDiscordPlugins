/**
 * @name MuteLocally
 * @author dededed1024
 * @version 1.0.1
 * @description Locally mute notifications, message indicators, and mention badges from servers
 * @website https://github.com/dededed1024/BetterDiscordPlugins
 * @source https://raw.githubusercontent.com/dededed1024/BetterDiscordPlugins/master/Plugins/MuteLocally/MuteLocally.plugin.js
 */

const { Data, Patcher, Webpack, ContextMenu } = BdApi;

module.exports = class MuteLocally {
    start() {
        this.blocked = new Set(Data.load("MuteLocally", "blocked") ?? []);

        // 뮤트 스토어 패치 → 알림/멘션 뱃지 처리를 Discord 자체 로직에 위임
        const UserGuildSettingsStore = Webpack.getStore("UserGuildSettingsStore");
        if (UserGuildSettingsStore) {
            const target = typeof UserGuildSettingsStore.isMuted === "function"
                ? UserGuildSettingsStore
                : Object.getPrototypeOf(UserGuildSettingsStore);

            if (typeof target.isMuted === "function") {
                Patcher.instead("MuteLocally", target, "isMuted", (_, [guildId], orig) =>
                    this.blocked.has(guildId) || orig(guildId)
                );
            }
        }

        this.menuPatch = ContextMenu.patch("guild-context", (tree, props) => {
            const guildId = props.guild?.id;
            if (!guildId) return;

            const isBlocked = this.blocked.has(guildId);
            tree.props.children.push(
                ContextMenu.buildItem({ type: "separator" }),
                ContextMenu.buildItem({
                    type: "toggle",
                    label: "Mute Server Locally",
                    checked: isBlocked,
                    action: () => {
                        this.blocked[isBlocked ? "delete" : "add"](guildId);
                        Data.save("MuteLocally", "blocked", [...this.blocked]);
                    }
                })
            );
        });
    }

    stop() {
        Patcher.unpatchAll("MuteLocally");
        this.menuPatch?.();
    }
};
