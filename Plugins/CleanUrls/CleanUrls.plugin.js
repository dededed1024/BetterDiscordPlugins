/**
 * @name CleanUrls
 * @author dededed6
 * @version 1.0.0
 * @description Remove tracking parameters from URLs using ClearURLs rules
 * @website https://github.com/dededed6/BetterDiscordPlugins
 * @source https://raw.githubusercontent.com/dededed6/BetterDiscordPlugins/master/CleanUrls/CleanUrls.plugin.js
 */

module.exports = class CleanUrls {
    constructor(meta) {
        this.meta = meta;
        this.settings = new SettingsManager(meta.name);
        this.rules = null;
        this.enabled = false;
        this.abortController = null;
    }

    async start() {
        const cfg = this.settings.current;
        if (cfg.enabled) {
            this.abortController = new AbortController();
            await this.loadRules();
            if (this.rules) {
                this.enabled = true;
                this.patchMessageSending();
                this.patchLinkClicks();
            }
        }
    }

    stop() {
        this.abortController?.abort();
        this.enabled = false;
        BdApi.Patcher.unpatchAll(this.meta.name);
    }

    getSettingsPanel() {
        const container = document.createElement("div");
        container.style.cssText = "color: var(--text-normal); padding: 10px;";

        const cfg = this.settings.current;

        const toggleRow = document.createElement("label");
        toggleRow.style.cssText = "display: flex; align-items: center; margin: 10px 0; cursor: pointer;";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = cfg.enabled;
        checkbox.style.cssText = "margin-right: 10px; cursor: pointer;";

        checkbox.addEventListener("change", () => {
            cfg.enabled = checkbox.checked;
            this.settings.save();
        });

        toggleRow.appendChild(checkbox);
        toggleRow.appendChild(document.createTextNode("Remove tracking parameters using ClearURLs rules"));
        container.appendChild(toggleRow);

        const info = document.createElement("div");
        info.style.cssText = "margin-top: 15px; padding: 10px; background: var(--background-secondary); border-radius: 4px; font-size: 12px;";
        info.textContent = "Automatically removes tracking parameters from Google, Amazon, Facebook, and more. Rules update daily.";
        container.appendChild(info);

        return container;
    }

    // ClearURLs 규칙 로드
    async loadRules() {
        const CACHE_DURATION = 24 * 60 * 60 * 1000;
        const cached = BdApi.Data.load(this.meta.name, "cache");

        if (cached?.rules && Date.now() - cached.timestamp < CACHE_DURATION) {
            this.rules = cached.rules;
            this.fetchRulesInBackground();
            return;
        }

        try {
            const response = await fetch("https://rules2.clearurls.xyz/data.minify.json", {
                signal: this.abortController?.signal
            });
            if (response.ok) {
                this.rules = await response.json();
                BdApi.Data.save(this.meta.name, "cache", {
                    timestamp: Date.now(),
                    rules: this.rules
                });
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                if (cached?.rules) this.rules = cached.rules;
            }
        }
    }

    // 백그라운드에서 규칙 업데이트
    fetchRulesInBackground() {
        fetch("https://rules2.clearurls.xyz/data.minify.json", {
            signal: this.abortController?.signal
        })
            .then(r => r.ok ? r.json() : null)
            .then(freshRules => {
                if (freshRules) {
                    this.rules = freshRules;
                    BdApi.Data.save(this.meta.name, "cache", {
                        timestamp: Date.now(),
                        rules: freshRules
                    });
                }
            })
            .catch(e => {
                if (e.name !== 'AbortError') {
                    // 백그라운드 업데이트 실패
                }
            });
    }

    // URL 정리
    cleanUrl(urlString) {
        if (!this.rules || !this.enabled) return urlString;

        try {
            let cleanedUrl = urlString;

            // 1단계: 정규식으로 파라미터 제거
            for (const provider of Object.values(this.rules.providers)) {
                try {
                    const pattern = new RegExp(provider.urlPattern, "i");
                    if (!pattern.test(urlString)) continue;

                    const isException = (provider.exceptions || []).some(e => new RegExp(e, "i").test(urlString));
                    if (isException || provider.completeProvider) continue;

                    for (const rule of (provider.rawRules || [])) {
                        try {
                            cleanedUrl = cleanedUrl.replace(new RegExp(rule, "i"), "");
                        } catch (e) { }
                    }
                } catch (e) { }
            }

            // 2단계: URL 파라미터 제거
            const url = new URL(cleanedUrl);

            for (const provider of Object.values(this.rules.providers)) {
                try {
                    const pattern = new RegExp(provider.urlPattern, "i");
                    if (!pattern.test(cleanedUrl)) continue;

                    const isException = (provider.exceptions || []).some(e => new RegExp(e, "i").test(cleanedUrl));
                    if (isException || provider.completeProvider) continue;

                    for (const rule of (provider.rules || [])) {
                        try {
                            const ruleRegex = new RegExp(`^${rule}$`, "i");
                            for (const key of [...url.searchParams.keys()]) {
                                if (ruleRegex.test(key)) {
                                    url.searchParams.delete(key);
                                }
                            }
                        } catch (e) { }
                    }
                } catch (e) { }
            }

            return url.toString();
        } catch (error) {
            return urlString;
        }
    }

    // 메시지 전송 시 URL 정리
    patchMessageSending() {
        const sendMsg = BdApi.Webpack.getByKeys("sendMessage");
        if (sendMsg?.sendMessage) {
            BdApi.Patcher.before(this.meta.name, sendMsg, "sendMessage", (_, [, msg]) => {
                if (msg?.content && this.enabled) {
                    msg.content = msg.content.replace(/https?:\/\/[^\s]+/g, url => this.cleanUrl(url));
                }
            });
        }
    }

    // 링크 클릭 시 URL 정리
    patchLinkClicks() {
        document.addEventListener("click", (e) => {
            if (!this.enabled) return;
            const link = e.target.closest("a[href]");
            if (link) {
                const href = link.getAttribute("href");
                if (href?.startsWith("http")) {
                    const cleanedUrl = this.cleanUrl(href);
                    if (cleanedUrl !== href) {
                        link.setAttribute("href", cleanedUrl);
                    }
                }
            }
        }, true);
    }
};

// 설정 관리
class SettingsManager {
    constructor(name) {
        this.name = name;
        this.defaultSettings = { enabled: true };
        this.current = Object.assign(structuredClone(this.defaultSettings), BdApi.Data.load(name, "settings") || {});
    }

    save() {
        BdApi.Data.save(this.name, "settings", this.current);
    }
}
