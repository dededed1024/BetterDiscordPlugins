/**
 * @name NoFlipWebcam
 * @author dededed1024
 * @version 1.0.1
 * @description Disables the mirror effect on your webcam
 * @website https://github.com/dededed1024/BetterDiscordPlugins
 * @source https://raw.githubusercontent.com/dededed1024/BetterDiscordPlugins/master/NoFlipWebcam/NoFlipWebcam.plugin.js
 */

module.exports = class NoFlipWebcam {
    constructor() {}
    start() { BdApi.DOM.addStyle("NoFlipWebcam", `[class*="mirror__"], [class^="camera__"] { transform: scaleX(1) !important; }`); }
    stop() { BdApi.DOM.removeStyle("NoFlipWebcam"); }
};
