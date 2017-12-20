/**
 * REAL Framework
 * File Name: login.js
 * Desc:      Login to session server.
 * Author:    ReeZhou
 */

var qcloud = require('../vendor/bower_components/wafer-client-sdk/index.js');
var config = require('../config.js');
var engine = require('../communication/engine.js');

var LOGIN_SUCCESS = "login";

var noop = function noop() { };
var loginInfo = {
    infoContent: "授权登录失败，部分功能将不能使用，是否重新登录？",
    status: null,
    success: noop,
    fail: noop,
    complete: noop,
};

function isLogin(callback) {
    console.log(loginInfo.status);
    if (loginInfo.status !== LOGIN_SUCCESS) {
        loginInfo.complete = callback;
        return false;
    }
    return true; 
}

function showLoginRemind() {
    wx.showModal({
        title: '提示',
        content: loginInfo.infoContent,
        showCancel: true,
        cancelText: "否",
        confirmText: "是",
        success: function (res) {
            relogin(res);
        },
    });
}

function relogin(val) {
    if (val.confirm) {
        if (wx.openSetting) {
            wx.openSetting({
                success: (res) => {
                    if (res.authSetting["scope.userInfo"]) {
                        getUserInfo();
                    } else {
                        loginInfo.fail();
                    }
                },
                fail: function () {
                    loginInfo.fail();
                },
            })
        }
    } else {
        loginInfo.fail();
    }
}

function login(options) {
    qcloud.setLoginUrl(config.serviceHost.loginUrl);

    var success = options.success || noop;
    var fail = options.fail || noop;
    loginInfo.success = function () {
        loginInfo.status = LOGIN_SUCCESS;
        // notify login success to engine
        engine.setUserInfo.apply(null, arguments);
        // notify login success where login called
        success.apply(null, arguments);
        // notify login success where waiting for logined (maybe in page)
        loginInfo.complete(null, arguments);
    }
    loginInfo.fail = fail;

    getUserInfo();
}

function getUserInfo() {
    qcloud.request({
        url: config.serviceHost.sessionUrl,
        login: true,
        header: config.defaultHeader,
        success(result) {
            console.log("[login] success:", result.data);
            loginInfo.success(result.data.data.userInfo);
        },
        fail(error) {
            console.log("[login] failed, error:", error);
            loginInfo.fail();
            showLoginRemind();
        },
        complete() {
            console.log("[login] complete.");
        },
    });
}

module.exports = {
    isLogin: isLogin,
    login: login,
    relogin: showLoginRemind,
}