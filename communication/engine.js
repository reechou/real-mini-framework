/**
 * REAL Framework
 * File Name: controller.js
 * Desc:      The controller of communication.
 * Author:    ReeZhou
 */
var qcloud = require('../vendor/bower_components/wafer-client-sdk/index.js');
var constants = require('./constants.js');
var wss = require('./wss.js');
var config = require('../config.js')

var ERROR_INFO = {
    ERR_INVALID_PARAMS: 'ERR_INVALID_PARAMS',
    ERR_SERVER: 'ERR_SERVER',
    ERR_TIMEOUT: 'ERR_TIMEOUT',
};

var ENGINE_INIT = "init";
var ENGINE_CLEAR = "clear";

var noop = function noop() { };
var defaultOptions = {
    defaultHeader: {},
    status: null,
    timeout: 5000, // wss timeout, default is 5000 millisecond
};

var getMsgId = (function () {
    var i = 0;
    return function () {
        return i++;
    };
})();

// socket req receive message callback 
var reqHandler = {};

/***
 * @class
 * request error
 */
var RequestError = (function () {
    function RequestError(type, message) {
        Error.call(this, message);
        this.type = type;
        this.message = message;
    }

    RequestError.prototype = new Error();
    RequestError.prototype.constructor = RequestError;

    return RequestError;
})();

/**
 * web socket message callback
 */
function wssReceiveMessageHandler(message) {
    if (!message[constants.PROTO_HEADER_SERVERNAME] || !message[constants.PROTO_HEADER_METHODNAME] || !message[constants.PROTO_HEADER_MSGID]) {
        console.log("[wss receive] message cannot found servername or method or msgid.");
        return;
    }
    if (!reqHandler[message[constants.PROTO_HEADER_MSGID]]) {
        console.log("[wss receive] message id cannot found success handler.");
        return;
    }

    var msgHandler = reqHandler[message[constants.PROTO_HEADER_MSGID]];
    // clear request timeout timer
    clearTimeout(msgHandler.timer);
    // delete request handler in map
    delete reqHandler[message[constants.PROTO_HEADER_MSGID]];
    // console.log("message handler:", msgHandler, "req handler:", reqHandler);

    // handle message data
    var data = JSON.parse(message.data);
    if (data.code != 0) {
        var message = '错误: ' + data.msg;
        msgHandler.fail(new RequestError(ERROR_INFO.ERR_SERVER, message));
    } else {
        msgHandler.success(data.data);
    }
}

/**
 * web socket broadcast callback
 */
function wssReceiveBroadcastHandler(message) {
    var pages = getCurrentPages();
    if (pages.length > 0) {
        if (pages[pages.length - 1].onBroadcast) {
            pages[pages.length - 1].onBroadcast(message);
        }
    }
}

/**
 * web socket request
 */
function wssRequest(options) {
    // check request
    if (typeof options !== 'object') {
        var message = '[wss] request params must be object, not ' + (typeof options);
        throw new RequestError(ERROR_INFO.ERR_INVALID_PARAMS, message);
    }
    if (!options.serverName) {
        var message = '[wss] request must has server name';
        throw new RequestError(ERROR_INFO.ERR_INVALID_PARAMS, message);
    }
    if (!options.methodName) {
        var message = '[wss] request must has method name';
        throw new RequestError(ERROR_INFO.ERR_INVALID_PARAMS, message);
    }

    var success = options.success || noop;
    var fail = options.fail || noop;

    var protoPack = {};
    protoPack[constants.PROTO_HEADER_SERVERNAME] = options.serverName;
    protoPack[constants.PROTO_HEADER_METHODNAME] = options.methodName;
    var msgId = (new Date()).valueOf() + "_" + getMsgId();
    protoPack[constants.PROTO_HEADER_MSGID] = msgId;
    protoPack = Object.assign(defaultOptions.defaultHeader, protoPack);
    protoPack[constants.PROTO_BODY_DATA] = options.data;
    console.log("[wss] request:", protoPack);

    var timer = setTimeout(function () {
        console.log("Server:", options.serverName, "Method:", options.methodName, " error of timeout.")
        fail(new RequestError(ERROR_INFO.ERR_TIMEOUT, '请求超时'));
        delete reqHandler.msgId;
    }, defaultOptions.timeout);
    // add wss request callback handler
    reqHandler[msgId] = { success: success, fail: fail, timer: timer };

    // send wss request
    wss.sendMsg(constants.TUNNEL_MESSAGE_TYPE_SOCKET, JSON.stringify(protoPack));
}

/**
 * https request
 */
function httpsRequest(options) {
    // check request
    if (typeof options !== 'object') {
        var message = '[https] request params must be object, not ' + (typeof options);
        throw new RequestError(ERROR_INFO.ERR_INVALID_PARAMS, message);
    }
    if (!options.url) {
        var message = '[https] request must has url';
        throw new RequestError(ERROR_INFO.ERR_INVALID_PARAMS, message);
    }
    if (!options.serverName) {
        var message = '[https] request must has server name';
        throw new RequestError(ERROR_INFO.ERR_INVALID_PARAMS, message);
    }
    if (!options.methodName) {
        var message = '[https] request must has method name';
        throw new RequestError(ERROR_INFO.ERR_INVALID_PARAMS, message);
    }

    var success = options.success || noop;
    var fail = options.fail || noop;
    var originHeader = options.header || {};
    var method = options.method || "POST";

    var header = Object.assign(defaultOptions.defaultHeader, originHeader);
    header[constants.PROTO_HEADER_SERVERNAME] = options.serverName;
    header[constants.PROTO_HEADER_METHODNAME] = options.methodName;

    var url = config.serviceHost.httpsUrl + options.url;
    console.log("[https] request:", url, options.serverName, options.methodName, method);
    qcloud.request({
        url: url,
        method: method,
        header: header,
        data: options.data,
        success: function (res) {
            var data = res.data;
            if (data.code == 0) {
                success(data.data);
            } else {
                var message = '错误: ' + data.msg;
                fail(new RequestError(ERROR_INFO.ERR_SERVER, message));
            }
        },
        fail: fail,
    });
}

/**
 * rpc with backend server
 */
function rpc(options = {}) {
    var protoType = constants.PROTO_TYPE_HTTPS;
    if (options.type) {
        protoType = options.type;
    } else if (config.defaultProtoType) {
        protoType = config.defaultProtoType;
    }
    
    switch (protoType) {
        case constants.PROTO_TYPE_WSS:
            wssRequest(options);
            break;
        case constants.PROTO_TYPE_HTTPS:
            httpsRequest(options);
            break;
        default:
            console.log("cannot found this proto type:", protoType);
    }
}

var setUserInfo = function (userinfo) {
    if (userinfo.id) {
        defaultOptions.defaultHeader[constants.PROTO_HEADER_USERID] = userinfo.id;
    }
}

var setTimeout = function (timeout) {
    if ((typeof (timeout) === "number") && (timeout !== Infinity) && !isNaN(timeout)) {
        defaultOptions.timeout = timeout;
        console.log("[engine] timeout:", defaultOptions.timeout);
    }
}

function init(header = {}) {
    if (defaultOptions.status == null) {
        console.log("[engine] first init with default header.");
        // just do when first init
        defaultOptions.defaultHeader = Object.assign(defaultOptions.defaultHeader, config.defaultHeader, header);
    }

    if (defaultOptions.status == ENGINE_INIT) {
        console.log("[engine] has been inited.");
        return;
    }
    if (config.defaultProtoType == constants.PROTO_TYPE_WSS) {
        console.log("[engine] init with wss.");
        wss.open({
            receiveMessageHandler: wssReceiveMessageHandler,
            receiveBroadcastHandler: wssReceiveBroadcastHandler,
        });
    }
    defaultOptions.status = ENGINE_INIT;
}

function clear() {
    if (config.defaultProtoType == constants.PROTO_TYPE_WSS) {
        // close tunnel
        wss.close();
    }
    defaultOptions.status = ENGINE_CLEAR;
}

module.exports = {
    init: init,
    clear: clear,
    rpc: rpc,
    setUserInfo: setUserInfo,
    setTimeout: setTimeout,
};