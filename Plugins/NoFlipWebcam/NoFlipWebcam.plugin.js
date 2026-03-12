/**
 * @name NoFlipWebcam
 * @author dededed6
 * @version 1.0.1
 * @description Disables the mirror effect on webcam video
 * @website https://github.com/dededed6/BetterDiscordPlugins
 * @source https://raw.githubusercontent.com/dededed6/BetterDiscordPlugins/master/NoFlipWebcam/NoFlipWebcam.plugin.js
 */

const { DOM } = BdApi;
const style = `
[class*="mirror__"], [class^="camera__"]
{
    transform: scaleX(1) !important;
}`;
    
module.exports = class NoFlipWebcam
{
    constructor() {}
    start() { DOM.addStyle("NoFlipWebcam", style); }
    stop() { DOM.removeStyle("NoFlipWebcam"); }
};
