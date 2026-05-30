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

    function showBubble(message) {
        const selfBubble = document.querySelector('.self-bubble');
        if (selfBubble) {
            selfBubble.textContent = message;
            selfBubble.style.display = 'block';
            setTimeout(() => {
                if (selfBubble) selfBubble.style.display = 'none';
            }, 3000);
        } else {
            if (window.notify) window.notify(message, 'info');
        }
    }

    window.WbyW = {
        isWhite: false, // 保留但不用于逻辑

        init: function(isWhite) {
            // 不需要实际使用，只是为了兼容旧调用
        },

        onDeadModeMessage: function() {
            playSound('/img/White/弃子求和.mp3');
            showBubble('弃子求和，绝无可能');
        },

        onCaptureWithinThreeMoves: function() {
            playSound('/img/White/先手优势.mp3');
            showBubble('先手优势，不可浪费');
        },

        onWhiteWin: function() {
            playSound('/img/White/败者成灰.mp3');
            showBubble('败者成灰，胜者为王');
        },

        onDoubleCheck: function() {
            playSound('/img/White/困兽之斗.mp3');
            showBubble('困兽之斗！');
        },

        onOpponentTimeout: function() {
            playSound('/img/White/等待时.mp3');
            showBubble('别用时间拖垮敌人，无趣');
        },

        onDeadModeAccepted: function() {
            playSound('/img/White/做好被击溃的准备.mp3');
            showBubble('做好被彻底击溃的觉悟');
        }
    };
})();