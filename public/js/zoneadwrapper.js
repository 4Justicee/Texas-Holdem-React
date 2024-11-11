// Copyright (c) Microsoft Corporation. All rights reserved.

function ZoneAdWrapper(targetDomain, targetFrame, debugConsoleLogging) {
    var _debug = false;
    if (debugConsoleLogging) {
        _debug = true;
    }

    var _self = this;
    var _targetDomain = targetDomain;
    var _targetFrame = targetFrame;

    var advertLevels = undefined;
    var adIntervalMSN = undefined;
    var adPlayCompletedTimestamp = undefined;
    var adIncentivePlaybackActive = false;
    var gameBeingPlayed = false;
    var gamePausedFlag = false;
    var timer = undefined;

    var domainList = new Array();
    domainList[domainList.length] = "zone.msn.com".toUpperCase();
    domainList[domainList.length] = "zone-uat.msn.com".toUpperCase();
    domainList[domainList.length] = "127.0.0.1".toUpperCase();
    domainList[domainList.length] = "games.masque.com".toUpperCase();
    domainList[domainList.length] = "www.gamezop.com".toUpperCase();
    domainList[domainList.length] = "localhost".toUpperCase();
    domainList[domainList.length] = "wgp-app-staging.azurewebsites.net".toUpperCase();
    domainList[domainList.length] = "wgp-app-uat.azurewebsites.net".toUpperCase();
    domainList[domainList.length] = "wgp-app-uat-feature-1.azurewebsites.net".toUpperCase();
    domainList[domainList.length] = "wgp-app-uat-feature-2.azurewebsites.net".toUpperCase();
    domainList[domainList.length] = "wgp-app-uat-feature-3.azurewebsites.net".toUpperCase();
    domainList[domainList.length] = "mcgzoneweb-staging.azurewebsites.net".toUpperCase();
    domainList[domainList.length] = "arcade.msn.com".toUpperCase();
    domainList[domainList.length] = "carbonatedgames.com".toUpperCase();
    domainList[domainList.length] = "carbonatedgames.eu".toUpperCase();
    domainList[domainList.length] = "carbonatedgames.mobi".toUpperCase();
    domainList[domainList.length] = "carbonatedgames.net".toUpperCase();
    domainList[domainList.length] = "carbonatedgames.org".toUpperCase();
    domainList[domainList.length] = "games.msn.com".toUpperCase();
    domainList[domainList.length] = "games.ca.msn.com".toUpperCase();
    domainList[domainList.length] = "games.msn.ca".toUpperCase();
    domainList[domainList.length] = "msngames.com".toUpperCase();
    domainList[domainList.length] = "msngamescasino.com".toUpperCase();
    domainList[domainList.length] = "msngamescasino.net".toUpperCase();
    domainList[domainList.length] = "zoneonlinecasino.com".toUpperCase();
    domainList[domainList.length] = "zoneonlinecasino.net".toUpperCase();
    domainList[domainList.length] = _targetDomain;

    function validateDomain(origin) {
        if (origin) {
            var protocolDomain = origin.split('://');
            var noSchemeUrl = protocolDomain[0];
            if (protocolDomain.length > 1) {
                noSchemeUrl = protocolDomain[1];
            }

            var originDomain = noSchemeUrl.split('/')[0].split(':')[0].toUpperCase();
            for (var i = 0; i < domainList.length; i++) {
                var candidateDomain = domainList[i];
                if (originDomain == candidateDomain) {
                    return true;
                }
                else if (originDomain.length > candidateDomain.length) {
                    candidateDomain = "." + candidateDomain;

                    if (originDomain.substring(originDomain.length - candidateDomain.length).toUpperCase() == candidateDomain) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    if (window.addEventListener) {
        window.addEventListener(
            "message",
            function (e) { receive(e); },
            false
        );
    }
    else {
        window.attachEvent(
            "onmessage",
            function (e) { receive(e); }
        );
    }

    log('ZoneAdWrapper initialized.');

    function send(msg) {
        if (_targetFrame) {
            _targetFrame.postMessage(msg, '*');
            log('Sending message: "' + msg + '" from ' + location.href + '.');
        }
        else {
            logError('Target frame is not defined.');
        }
    }

    function enableTimerAd() {
        if (!advertLevels) {
            timer = setTimeout(
                function () {
                    if (_self.onReceivingPlayAd && gameBeingPlayed && !gamePausedFlag) {
                        _self.onReceivingPlayAd();
                        log('Triggered time interval based ad request.');
                    }
                },
                adIntervalMSN);
        }
    }

    function preloadAdCompleteTimestamp() {
        if (!adPlayCompletedTimestamp) {
            adPlayCompletedTimestamp = new Date();
        }
    }

    function receive(e) {
        if (validateDomain(e.origin)) {
            if (e.data) {
                log('Received message: ' + e.data + ' at ' + location.href + '.');
                if (e.data.toString().indexOf("<score>") > -1) {
                    if (_self.onReceivingScore) {
                        setTimeout(
                            function () { _self.onReceivingScore(e.data); },
                            500);
                    }
                }
                else if (e.data.toString().indexOf("adInterval") > -1) {
                    preloadAdCompleteTimestamp();
                    var tempArr = e.data.toString().split(':');
                    adIntervalMSN = parseInt(tempArr[1].toString());

                    if (timer) {
                        clearTimeout(timer);
                    }

                    enableTimerAd();
                }
                else if (e.data.toString().indexOf("adLevels") > -1) {
                    preloadAdCompleteTimestamp();
                    var tempArr2 = e.data.toString().split(':');
                    advertLevels = parseInt(tempArr2[1].toString());

                    if (timer) {
                        clearTimeout(timer);
                    }

                    enableTimerAd();
                }
                else {
                    switch (e.data) {
                        case 'startAdPlayback':
                            if (_self.onStartAdPlayback) {
                                _self.onStartAdPlayback();
                            }

                            break;
                        case 'adPlaybackCompleted':
                            if (adIncentivePlaybackActive) {
                                adIncentivePlaybackActive = false;
                            }
                            else {
                                adPlayCompletedTimestamp = new Date();
                                if (timer) {
                                    clearTimeout(timer);
                                }

                                enableTimerAd();
                            }

                            if (_self.onAdPlaybackCompleted) {
                                _self.onAdPlaybackCompleted();
                            }

                            log('Ad playback completed at ' + adPlayCompletedTimestamp.toString() + '.');
                            break;
                        case 'quitGame':
                            if (_self.onQuitGame) {
                                _self.onQuitGame();
                            }

                            break;
                        case 'requestAd':
                            if (_self.onRequestingAd) {
                                _self.onRequestingAd();
                            }

                            break;
                        case 'newGame':
                            if (_self.onReceivingNewGame) {
                                _self.onReceivingNewGame();
                            }

                            break;
                        case 'gamePaused':
                            if (_self.onReceivingGameState) {
                                _self.onReceivingGameState(1);
                            }

                            break;
                        case 'gameUnPaused':
                            if (_self.onReceivingGameState) {
                                _self.onReceivingGameState(0);
                            }

                            break;
                        case 'gameEnded':
                            if (_self.onReceivingGameEnded) {
                                _self.onReceivingGameEnded();
                            }

                            break;
                        case 'pauseGame':
                            if (_self.onReceivingPauseGame) {
                                _self.onReceivingPauseGame();
                            }

                            break;
                        case 'muteGame':
                            if (_self.onReceivingMuteGame) {
                                _self.onReceivingMuteGame();
                            }

                            break;
                        case 'readyForComm':
                            if (_self.onReceivingReadyForComm) {
                                _self.onReceivingReadyForComm();
                            }

                            break;
                        case 'completedLevel':
                            if (_self.onCompletedLevel) {
                                _self.onCompletedLevel();
                            }

                            break;
                        case 'enableDebugConsoleLogging':
                            _debug = true;
                            break;
                        case 'disableDebugConsoleLogging':
                            _debug = false;
                            break;
                        default:
                            log('Handler for this message is not defined.');
                            break;
                    }
                }
            }
        }
        else {
            // Ignore if message is not coming from the expected domain, this may not be for us.
            log('Ignoring the message received, as the origin and target does not match.');

            return;
        }
    }

    function log(msg) {
        var d = new Date();
        var timeStamp = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
        if (_debug && console) {
            console.log('ZoneAdWrapper: ' + timeStamp + " >> " + msg);
        }
    }

    function logError(msg) {
        if (console) {
            console.error('ZoneAdWrapper: Error: ' + msg);
        }
    }

    /*************** PUBLIC METHODS ***************/
    this.startAdPlayback = function () {
        send('startAdPlayback');
    };

    this.adPlaybackCompleted = function () {
        send('adPlaybackCompleted');
    };

    this.quitGame = function () {
        send('quitGame');
    };

    this.gameEnded = function () {
        gameBeingPlayed = false;
        send('gameEnded');
    };

    this.submitScore = function (score, time) {
        var scoreXml = '<game><score>' + score + '</score><time>' + time + '</time></game>';
        send(scoreXml);
    };

    this.requestAd = function () {
        send('requestAd');
    };

    this.gameStarted = function () {
        gameBeingPlayed = true;
        gamePausedFlag = false;
        send('newGame');
    };

    this.gamePaused = function (flag) {
        if (flag == 1) {
            gamePausedFlag = true;
            send('gamePaused');
        }
        else {
            gamePausedFlag = false;
            send('gameUnPaused');
        }
    };

    this.pauseGame = function () {
        send('pauseGame');
    };

    this.muteGame = function () {
        send('muteGame');
    };

    this.readyForComm = function () {
        send('readyForComm');
    };

    this.sendAdInterval = function (adInterval) {
        send('adInterval:' + adInterval);
    };

    this.sendAdLevels = function (adLevels) {
        send('adLevels:' + adLevels);
    };

    this.sendCompletedLevel = function () {
        send('completedLevel');
    }

    this.completedLevel = function (levelCompleted) {
        this.sendCompletedLevel();
        var playAdTemp = false;
        if (!adIntervalMSN) {
            playAdTemp = true;
            if (typeof (appInsights) != 'undefined') {
                var appInsightsProperties = {
                    referrer: document.referrer ? document.referrer : 'Not Available',
                    url: window.location.href,
                    userAgent: window.navigator.userAgent
                };

                appInsights.trackEvent({ name: 'GDKNoAdIntervalConfigured' }, appInsightsProperties);
            }
        }
        else if (new Date().getTime() - adPlayCompletedTimestamp.getTime() > adIntervalMSN) {
            // Level completed, with last ad completed timestamp more than time interval configured.
            playAdTemp = true;
        }

        if (playAdTemp) {
            if (_self.onReceivingPlayAd) {
                _self.onReceivingPlayAd();
            }

            if (_self.startAdPlayback) {
                _self.startAdPlayback();
                log("ZoneAdWrapper: triggered level based ad request.");
            }
        }

        return false;
    };

    this.acceptedIncentive = function() {
        adIncentivePlaybackActive = true;
        if (_self.onReceivingPlayAd) {
            _self.onReceivingPlayAd();
        }

        if (_self.startAdPlayback) {
            _self.startAdPlayback();
            log("ZoneAdWrapper: triggered incentive based ad request.");
        }
    }

    this.disableDebugConsoleLogging = function() {
        send('disableDebugConsoleLogging');
    }

    this.enableDebugConsoleLogging = function() {
        send('enableDebugConsoleLogging');
    }

    this.onAdPlaybackCompleted = undefined;
    this.onCompletedLevel = undefined;
    this.onQuitGame = undefined;
    this.onReceivingScore = undefined;
    this.onReceivingNewGame = undefined;
    this.onReceivingGameEnded = undefined;
    this.onReceivingGameState = undefined;
    this.onReceivingPauseGame = undefined;
    this.onReceivingMuteGame = undefined;
    this.onReceivingReadyForComm = undefined;
    this.onReceivingPlayAd = undefined;
    this.onStartAdPlayback = undefined;
}

var msnAdWrapper;

function InitMsnAdWrapper(debugConsoleLogging) {
    if (ZoneAdWrapper) {
        msnAdWrapper = new ZoneAdWrapper("//zone.msn.com", parent, debugConsoleLogging);
    }
}
