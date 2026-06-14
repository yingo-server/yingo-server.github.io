'use strict';

const Play = (() => {
    const audio = new Audio();
    let playlist = [];
    let curIdx = -1;
    let mode = 0; // 0 列表循环 1 单曲循环 2 随机
    let playing = false;
    let timer = null;
    let lyrics = [];
    let lyricIdx = -1;
    let autoListId = null;
    let autoMaxPage = 1;
    let autoCurPage = 1;
    let loadingMore = false;

    async function loadAndPlay(songs, idx, listId, maxPage) {
        playlist = songs;
        curIdx = idx;
        autoListId = listId || null;
        autoMaxPage = maxPage || 1;
        autoCurPage = 1;
        loadingMore = false;
        await playIdx(idx);
    }

    async function playIdx(idx) {
        if (idx < 0 || idx >= playlist.length) return;
        curIdx = idx;
        const song = playlist[idx];
        const hash = song.hash || song.FileHash || '';
        if (!hash) { Tool.toast('缺少歌曲标识'); return; }

        const albumAudioId = song.album_audio_id || song.mixsongid || song.Audioid || '';
        if (!albumAudioId) console.warn('缺少 album_audio_id，可能无法获取完整链接');

        const cacheKey = `url_${hash}_${albumAudioId}`;
        const url = await Tool.cachedFetch(cacheKey, async () => {
            let res = await Net.request('/song/url', { hash, quality: '320', album_audio_id: albumAudioId });
            let u = Net.extractSongUrl(res);
            if (u) return u;
            res = await Net.request('/song/url', { hash, quality: '128', album_audio_id: albumAudioId });
            u = Net.extractSongUrl(res);
            if (u) return u;
            res = await Net.request('/song/url', { hash, quality: '64', album_audio_id: albumAudioId });
            u = Net.extractSongUrl(res);
            if (u) return u;
            // 降级新版（试听）
            res = await Net.request('/song/url/new', { hash });
            u = Net.extractSongUrl(res);
            if (u) return u;
            throw new Error('No playable URL');
        }, 7200000); // 2小时

        if (!url) { Tool.toast('无法获取播放地址'); return; }

        document.getElementById('playerLyricPage').innerHTML = '';
        document.getElementById('minibarLyric').textContent = '点击播放音乐';
        lyrics = [];

        audio.src = url;
        audio.onended = () => {
            if (mode === 1) audio.currentTime = 0, audio.play();
            else next();
        };
        try {
            await audio.play();
            playing = true;
            updateUI(song);
            startTimer();
            loadLyric(hash);
        } catch (err) {
            Tool.toast('播放失败: ' + err.message);
        }

        if (autoListId && idx >= playlist.length - 3 && autoCurPage <= autoMaxPage && !loadingMore) {
            loadingMore = true;
            const res = await Net.request('/playlist/track/all/new', { listid: autoListId, page: autoCurPage, pagesize: 50 });
            const rows = res.data?.info || [];
            if (rows.length) {
                const newSongs = rows.map(r => ({
                    name: r.name || r.songname || '未知',
                    hash: r.hash || '',
                    author_name: r.singerinfo?.[0]?.name || '',
                    album_audio_id: r.album_audio_id || r.mixsongid || r.Audioid || '',
                    Image: r.cover || (r.trans_param?.union_cover) || ''
                }));
                playlist.push(...newSongs);
                autoCurPage++;
            }
            loadingMore = false;
        }
    }

    function toggle() {
        if (!audio.src) return;
        if (playing) { audio.pause(); playing = false; stopTimer(); }
        else { audio.play().then(() => { playing = true; startTimer(); }).catch(()=>{}); }
        updatePlayBtn();
    }

    function prev() {
        if (!playlist.length) return;
        let idx = mode === 2 ? Math.floor(Math.random() * playlist.length) : curIdx - 1;
        if (idx < 0) idx = playlist.length - 1;
        playIdx(idx);
    }

    function next() {
        if (!playlist.length) return;
        let idx = mode === 2 ? Math.floor(Math.random() * playlist.length) : curIdx + 1;
        if (idx >= playlist.length) idx = 0;
        playIdx(idx);
    }

    function cycleMode() {
        mode = (mode + 1) % 3;
        const btn = document.getElementById('playerModeBtn');
        if (btn) btn.classList.toggle('active', mode !== 0);
    }

    function updateUI(song) {
        const name = song.songname || song.name || '未知';
        const author = song.author_name || song.SingerName || '';
        document.getElementById('minibarTitle').textContent = name + (author ? ' - ' + author : '');
        const cover = Tool.coverUrl(song);
        Tool.setImage(document.getElementById('minibarCover'), cover);
        Tool.setImage(document.getElementById('playerCover'), cover);
        updatePlayBtn();
    }

    function updatePlayBtn() {
        const playIcon = '<i class="fas fa-play"></i>';
        const pauseIcon = '<i class="fas fa-pause"></i>';
        const miniBtn = document.getElementById('minibarPlayBtn');
        const mainBtn = document.getElementById('playerMainPlay');
        if (miniBtn) miniBtn.innerHTML = playing ? pauseIcon : playIcon;
        if (mainBtn) mainBtn.innerHTML = playing ? pauseIcon : playIcon;
    }

    function startTimer() {
        stopTimer();
        timer = setInterval(() => {
            if (!audio.duration) return;
            const cur = audio.currentTime;
            document.getElementById('playerTimeCur').textContent = Tool.formatTime(cur);
            document.getElementById('playerTimeTotal').textContent = Tool.formatTime(audio.duration);
            const percent = (cur / audio.duration) * 100;
            document.getElementById('playerProgressFill').style.width = percent + '%';
            updateLyricHighlight(cur);
        }, 200);
    }

    function stopTimer() { if (timer) clearInterval(timer); timer = null; }

    function seekProgress(e) {
        const bar = document.getElementById('playerProgressBar');
        const rect = bar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = audio.duration * Math.min(1, Math.max(0, percent));
    }

    async function loadLyric(hash) {
        try {
            let res = await Net.request('/search/lyric', { hash });
            let candidates = res.data?.candidates || [];
            if (!candidates.length) {
                const s = playlist[curIdx];
                if (s) {
                    res = await Net.request('/search/lyric', { keywords: s.songname || s.name });
                    candidates = res.data?.candidates || [];
                }
            }
            if (!candidates.length) return;
            const { id, accesskey } = candidates[0];
            res = await Net.request('/lyric', { id, accesskey, fmt: 'lrc', decode: 'true' });
            const content = res.data?.content || '';
            if (!content) return;
            lyrics = parseLRC(content);
            renderLyrics();
        } catch(e) { console.error(e); }
    }

    function parseLRC(lrc) {
        const result = [];
        const lines = lrc.split('\n');
        const re = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;
        for (let line of lines) {
            const match = line.match(re);
            if (!match) continue;
            const text = line.replace(re, '').trim();
            if (!text) continue;
            const time = parseInt(match[1])*60 + parseInt(match[2]) + (match[3] ? parseInt(match[3].padEnd(3,'0'))/1000 : 0);
            result.push({ time, text });
        }
        result.sort((a,b) => a.time - b.time);
        return result;
    }

    function renderLyrics() {
        const container = document.getElementById('playerLyricPage');
        if (!container) return;
        container.innerHTML = '';
        lyrics.forEach((l, i) => {
            const div = document.createElement('div');
            div.className = 'lyric-line';
            div.dataset.idx = i;
            div.textContent = l.text;
            container.appendChild(div);
        });
    }

    function updateLyricHighlight(cur) {
        if (!lyrics.length) return;
        let idx = -1;
        for (let i = 0; i < lyrics.length; i++) {
            if (lyrics[i].time <= cur) idx = i;
            else break;
        }
        if (idx !== lyricIdx) {
            const lines = document.querySelectorAll('#playerLyricPage .lyric-line');
            lines.forEach((l, i) => l.classList.toggle('active', i === idx));
            if (idx >= 0) {
                const active = lines[idx];
                active?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('minibarLyric').textContent = lyrics[idx].text;
            }
            lyricIdx = idx;
        }
    }

    function getPlaylist() { return playlist; }
    function getCurIdx() { return curIdx; }

    return { loadAndPlay, playIdx, toggle, prev, next, cycleMode, seekProgress, getPlaylist, getCurIdx };
})();