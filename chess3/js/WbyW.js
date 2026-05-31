// 白方语音模块
(function() {
    let audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function playSound(url) {
        try {
            const a = getAudioCtx();
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => a.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    const source = a.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(a.destination);
                    source.start();
                })
                .catch(err => console.warn('播放语音失败:', url, err));
        } catch(e) {
            console.warn('语音播放错误', e);
        }
    }

    // 显示气泡，isOpponent 为 true 时显示在对手头像，为 false 时显示在己方头像
    function showBubble(message, isOpponent = false) {
        const targetBubble = isOpponent ? document.querySelector('.opponent-bubble') : document.querySelector('.self-bubble');
        if (targetBubble) {
            targetBubble.textContent = message;
            targetBubble.style.display = 'block';
            setTimeout(() => {
                if (targetBubble) targetBubble.style.display = 'none';
            }, 3000);
        } else {
            if (window.notify) window.notify(message, 'info');
        }
    }

    window.WbyW = {
        onDeadModeMessage: function(isOpponent = false) {
            playSound('img/White/弃子求和.mp3');
            showBubble('弃子求和，绝无可能', isOpponent);
        },
        onCaptureWithinThreeMoves: function(isOpponent = false) {
            playSound('img/White/先手优势.mp3');
            showBubble('先手优势，不可浪费', isOpponent);
        },
        onWhiteWin: function(isOpponent = false) {
            playSound('img/White/败者成灰.mp3');
            showBubble('败者成灰，胜者为王', isOpponent);
        },
        onDoubleCheck: function(isOpponent = false) {
            playSound('img/White/困兽之斗.mp3');
            showBubble('困兽之斗！', isOpponent);
        },
        onOpponentTimeout: function(isOpponent = false) {
            playSound('img/White/等待时.mp3');
            showBubble('别用时间拖垮敌人，无趣', isOpponent);
        },
        onDeadModeAccepted: function(isOpponent = false) {
            playSound('img/White/做好被击溃的准备.mp3');
            showBubble('做好被彻底击溃的觉悟', isOpponent);
        }
    };
})();