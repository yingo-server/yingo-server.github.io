// AI 模块 (Stockfish 引擎)
(function() {
    let worker = null;
    let ready = false;
    let pendingResolve = null;
    let pendingFen = null;

    function init() {
        if (worker) {
            worker.terminate();
        }
        try {
            worker = new Worker('wasm/stockfish-18-lite-single.js');
            worker.onmessage = (e) => {
                const msg = e.data;
                if (msg === 'uciok') {
                    worker.postMessage('setoption name Skill Level value 12');
                    worker.postMessage('isready');
                } else if (msg === 'readyok') {
                    ready = true;
                    if (pendingFen) {
                        const fen = pendingFen;
                        const movetime = pendingResolve?.movetime || 15000;
                        pendingFen = null;
                        worker.postMessage(`position fen ${fen}`);
                        worker.postMessage(`go movetime ${movetime}`);
                    }
                } else if (msg.startsWith('bestmove')) {
                    const parts = msg.split(' ');
                    const best = parts[1];
                    if (pendingResolve) {
                        pendingResolve.callback(best);
                        pendingResolve = null;
                    }
                }
            };
            worker.onerror = (err) => {
                console.error('AI Worker error:', err);
                if (pendingResolve) {
                    pendingResolve.callback(null);
                    pendingResolve = null;
                }
            };
            worker.postMessage('uci');
        } catch(e) {
            console.error('AI init error:', e);
        }
    }

    function getBestMove(fen, movetime = 15000) {
        return new Promise((resolve) => {
            if (!ready) {
                pendingResolve = { callback: resolve, movetime };
                pendingFen = fen;
                return;
            }
            pendingResolve = { callback: resolve, movetime };
            worker.postMessage(`position fen ${fen}`);
            worker.postMessage(`go movetime ${movetime}`);
        });
    }

    function setSkillLevel(level) {
        if (ready && worker) {
            worker.postMessage(`setoption name Skill Level value ${Math.min(20, Math.max(0, level))}`);
        }
    }

    function newGame() {
        if (worker) worker.postMessage('ucinewgame');
        ready = false;
        pendingResolve = null;
        pendingFen = null;
        init(); // 重新初始化
    }

    function terminate() {
        if (worker) {
            worker.terminate();
            worker = null;
        }
        ready = false;
        pendingResolve = null;
        pendingFen = null;
    }

    window.AiEngine = {
        init,
        getBestMove,
        setSkillLevel,
        newGame,
        terminate,
        get ready() { return ready; }
    };
})();