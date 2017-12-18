/**
 * REAL Framework
 * File Name: config.js
 * Desc:      Global config of framework.
 * Author:    ReeZhou
 */

var config = {
    serviceHost: {
        loginUrl: `https://access.hunlibaoapp.com/wafer/login`,
        sessionUrl: `https://access.hunlibaoapp.com/wafer/user`,
        tunnelUrl: `https://access.hunlibaoapp.com/wafer/tunnel`,
        httpsUrl: ``
    },

    defaultHeader: {
        appid: "wx5c62dc64184ddb74"
    },

    defaultProtoType: "wss"
};

module.exports = config;