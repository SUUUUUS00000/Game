(function () {
    'use strict';

    var lastPingTime = Date.now();
    var isTriggered = false;
    var initialCodeHash = null;

    function executeCrashAndKick(reasonMessage) {
        if (isTriggered) return;
        isTriggered = true;

        document.body.innerHTML = '<div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;color:#FF3B30;display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:9999999;font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;padding:20px;box-sizing:border-box;">' +
            '<h1 style="font-size:30px;font-weight:900;margin-bottom:12px;letter-spacing:-0.5px;">SENTINEL INTEGRITY SYSTEM</h1>' +
            '<p style="font-size:18px;color:#FFFFFF;margin-bottom:24px;font-weight:600;">' + reasonMessage + '</p>' +
            '<div style="font-size:13px;color:#8E8E93;">Disconnecting from server session...</div>' +
            '</div>';

        setTimeout(function () {
            window.location.href = 'about:blank';
            while (true) {}
        }, 1500);
    }

    function computeHash(inputString) {
        var hash = 0;
        if (!inputString || inputString.length === 0) return hash;
        for (var i = 0; i < inputString.length; i++) {
            var charCode = inputString.charCodeAt(i);
            hash = ((hash << 5) - hash) + charCode;
            hash |= 0;
        }
        return hash;
    }

    var SIS_Engine = {
        name: 'Sentinel Integrity System',
        version: '2.4.0',
        receiveHeartbeat: function (codePayload) {
            if (isTriggered) return;
            lastPingTime = Date.now();

            if (typeof codePayload !== 'string' || codePayload.length < 30) {
                executeCrashAndKick('Detected Tampering');
                return;
            }

            var currentHash = computeHash(codePayload);
            if (initialCodeHash === null) {
                initialCodeHash = currentHash;
            } else if (initialCodeHash !== currentHash) {
                executeCrashAndKick('Detected Tampering');
            }
        },
        verifyIntegrity: function () {
            return true;
        }
    };

    Object.freeze(SIS_Engine);

    try {
        Object.defineProperty(window, 'SIS', {
            value: SIS_Engine,
            writable: false,
            configurable: false
        });
    } catch (e) {
        executeCrashAndKick('Detected Tampering');
    }

    setInterval(function () {
        if (isTriggered) return;
        var now = Date.now();
        if (now - lastPingTime > 25000) {
            executeCrashAndKick('The server was unresponsive for 25 seconds.');
        }
    }, 1000);

    setInterval(function () {
        if (isTriggered) return;
        if (!window.SIS || window.SIS !== SIS_Engine || typeof window.SIS.receiveHeartbeat !== 'function') {
            executeCrashAndKick('The site has been damaged!');
        }
    }, 1500);

    var domObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.removedNodes.forEach(function (node) {
                if (node.tagName === 'SCRIPT' && node.src && node.src.indexOf('ac.js') !== -1) {
                    executeCrashAndKick('The site has been damaged!');
                }
            });
        });
    });

    domObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
