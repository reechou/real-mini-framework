/**
 * REAL Framework
 * File Name: wss.js
 * Desc:      Communication with server by websocket.
 * Author:    ReeZhou
 */

var qcloud = require('../vendor/bower_components/wafer-client-sdk/index.js');
var config = require('../config.js')
var constants = require('./constants.js');
var utils = require('../utils/utils.js');

// tunnel status
var TUNNEL_CONNECTED = "connected";
var TUNNEL_CLOSED = "closed";
var TUNNEL_ERROR = "error";
var TUNNEL_CONNECTING = "connecting";
var TUNNEL_RECONNECTING = "reconnecting";

var noop = function noop() { };
var wssOptions = {
    status: null,
    tunnelUrl: config.serviceHost.tunnelUrl,
    header: config.defaultHeader,
    connectedHandler: noop,
    receiveMessageHandler: noop,
    receiveBroadcastHandler: noop,
};

function openConnect(options) {
    // tunnel has been init, just open connect
    if (this.tunnel && this.tunnel.isClosed()) {
        console.log("[wss] tunnel has been init, just open connect.");
        this.tunnel.open();
        return;
    }

    wssOptions = utils.extend({}, wssOptions, options);
    console.log("[wss] default options:", wssOptions);

    console.log("[wss] start connect to", wssOptions.tunnelUrl, "...");
    var tunnel = this.tunnel = new qcloud.Tunnel(wssOptions.tunnelUrl, wssOptions.header);

    tunnel.on("connect", () => {
        console.log("[wss] tunnel is connected.");
        wssOptions.status = TUNNEL_CONNECTED;
    });

    tunnel.on("close", () => {
        console.log("[wss] tunnel is closed.");
        wssOptions.status = TUNNEL_CLOSED;
    });

    tunnel.on("reconnecting", () => {
        console.log("[wss] tunnel is reconnecting...");
        wssOptions.status = TUNNEL_RECONNECTING;
    });

    tunnel.on("reconnect", () => {
        console.log("[wss] tunnel is reconnected.");
        wssOptions.status = TUNNEL_CONNECTED;
    });

    tunnel.on("error", error => {
        console.log("[wss] tunnle is error:", error.message);
    })

    tunnel.on(constants.TUNNEL_MESSAGE_TYPE_SOCKET, message => {
        console.log("[wss] get socket message:", message);
        wssOptions.receiveMessageHandler(message);
    });

    tunnel.on(constants.TUNNEL_MESSAGE_TYPE_BROADCAST, message => {
        console.log("[wss] get broadcast message:", message);
        wssOptions.receiveBroadcastHandler(message);
    });

    tunnel.open();
    wssOptions.status = TUNNEL_CONNECTING;
}

function close() {
    console.log("[wss] in close");
    if (this.tunnel && this.tunnel.isActive()) {
        console.log("[wss] do tunnel close.");
        this.tunnel.close();
    }
}

function sendMsg(msgType, msgContent) {
    this.tunnel.emit(msgType, msgContent);
}

module.exports = {
    open: openConnect,
    close: close,
    sendMsg: sendMsg,
};