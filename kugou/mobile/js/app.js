(function() {
    // ---------- 配置 ----------
    const API_BASE = 'https://kapi.344977.xyz';
    let TOKEN = null;
    let USERID = null;
    let DFID = null;

    // DOM 元素
    let homePage, myPage, playlistPage, searchPage, loginOverlay, minibar, fullPlayer;

    // 播放器状态
    let audio = new Audio();
    let currentPlaylist = [];
    let currentIndex = -1;
    let playing = false;
    let progressTimer = null;
    let mode = 0; // 0列表 1单曲 2随机

    // 歌单分页
    let currentPlaylistId = null;
    let currentPlaylistTotal = 0;
    let currentPlaylistPage = 1;
    let currentPlaylistMaxPage = 1;
    let playlistSongs = [];
    let playlistLoading = false;

    // 验证码倒计时
    let cdTimer = null;
    let cdNum = 0;

    // ---------- 工具 ----------
    function toast(msg, isError = false) {
        let el = document.querySelector('.toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'toast';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        if (isError) el.style.borderLeftColor = '#ff4444';
        else el.style.borderLeftColor = 'var(--accent)';
        el.classList.add('show');
        clearTimeout(el._timer);
        el._timer = setTimeout(() => el.classList.remove('show'), 4000);
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return '00:00';
        let m = Math.floor(sec / 60);
        let s = Math.floor(sec % 60);
        return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }

    function imgUrl(url, size = 240) {
        if (!url) return '';
        return url.replace(/\{size\}/g, String(size));
    }

    function setImage(el, url, fallback = '---') {
        if (!el) return;
        if (!url) { el.textContent = fallback; return; }
        let img = new Image();
        img.onload = () => { el.innerHTML = ''; el.appendChild(img); };
        img.onerror = () => { el.textContent = fallback; };
        img.src = imgUrl(url);
    }

    // ---------- 永久缓存 dfid ----------
    function loadDfid() {
        const stored = localStorage.getItem('dfid');
        if (stored) {
            DFID = stored;
            return true;
        }
        return false;
    }

    async function fetchAndCacheDfid() {
        try {
            let url = new URL('/register/dev', API_BASE);
            url.searchParams.set('timestamp', Date.now());
            let resp = await fetch(url);
            let json = await resp.json();
            if (json.status === 1 && json.data && json.data.dfid) {
                DFID = json.data.dfid;
                localStorage.setItem('dfid', DFID);
                toast('设备标识获取成功');
                return true;
            } else {
                toast('获取 dfid 失败：' + (json.message || '未知错误'), true);
                return false;
            }
        } catch (e) {
            toast('获取 dfid 网络错误', true);
            return false;
        }
    }

    async function ensureDfid() {
        if (loadDfid()) return true;
        return await fetchAndCacheDfid();
    }

    // 加载认证信息
    function loadAuth() {
        const auth = localStorage.getItem('auth');
        if (auth) {
            try {
                const obj = JSON.parse(auth);
                if (obj.expire > Date.now()) {
                    TOKEN = obj.token;
                    USERID = obj.userid;
                    return true;
                } else {
                    localStorage.removeItem('auth');
                }
            } catch(e) {}
        }
        return false;
    }

    function saveAuth(token, userid) {
        const expire = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('auth', JSON.stringify({ token, userid, expire }));
        TOKEN = token;
        USERID = userid;
    }

    function clearAuth() {
        localStorage.removeItem('auth');
        TOKEN = null;
        USERID = null;
    }

    // ---------- 核心请求：强制携带 cookie ----------
    async function request(path, params = {}) {
        if (!DFID) {
            const ok = await ensureDfid();
            if (!ok) throw new Error('无法获取设备标识');
        }

        let url = new URL(path, API_BASE);
        params.timestamp = Date.now();

        let cookieParts = [`dfid=${DFID}`];
        if (TOKEN && USERID) {
            cookieParts.push(`token=${TOKEN}`);
            cookieParts.push(`userid=${USERID}`);
        }
        params.cookie = cookieParts.join(';');

        Object.keys(params).forEach(k => {
            if (params[k] !== undefined && params[k] !== null && params[k] !== '')
                url.searchParams.set(k, String(params[k]));
        });

        try {
            let resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
            let json = await resp.json();
            if (json.status !== 1 && json.error_code !== 0 && json.error_code !== 20010 && json.status !== 2) {
                toast(`${path}: ${json.message || `错误码${json.error_code}`}`, true);
            }
            return json;
        } catch (e) {
            toast(`请求失败: ${e.message}`, true);
            throw e;
        }
    }

    // ---------- 登录相关 ----------
    async function sendCode(mobile) {
        // 立即开始倒计时（不管成功与否）
        startCD(60);
        let res;
        try {
            res = await request('/captcha/sent', { mobile });
        } catch (e) {
            // 请求出错，停止倒计时
            stopCD();
            toast('发送验证码失败: ' + e.message, true);
            return;
        }
        if (res.error_code === 20015) {
            stopCD();
            toast('该号码发送的短信数已经超过上限', true);
        } else if (res.status === 1) {
            toast('验证码已发送');
            // 倒计时继续（已启动）
        } else {
            stopCD();
            toast(res.message || '发送失败', true);
        }
    }

    function startCD(seconds) {
        if (cdTimer) clearInterval(cdTimer);
        cdNum = seconds;
        const btn = document.getElementById('loginSendBtn');
        if (!btn) return;
        btn.disabled = true;
        btn.textContent = `${cdNum}秒`;
        cdTimer = setInterval(() => {
            cdNum--;
            if (cdNum <= 0) {
                clearInterval(cdTimer);
                cdTimer = null;
                btn.disabled = false;
                btn.textContent = '获取验证码';
            } else {
                btn.textContent = `${cdNum}秒`;
            }
        }, 1000);
    }

    function stopCD() {
        if (cdTimer) {
            clearInterval(cdTimer);
            cdTimer = null;
        }
        const btn = document.getElementById('loginSendBtn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '获取验证码';
        }
    }

    async function loginWithCode(mobile, code) {
        let res = await request('/login/cellphone', { mobile, code });
        if (res.data?.token) {
            saveAuth(res.data.token, res.data.userid);
            toast('登录成功');
            loginOverlay.classList.remove('show');
            loadMyPage();
            loadHome();
            return true;
        }
        toast('登录失败：' + (res.message || '未知错误'), true);
        return false;
    }

    async function loginWithPassword(username, password) {
        let res = await request('/login', { username, password: encodeURIComponent(password) });
        if (res.data?.token) {
            saveAuth(res.data.token, res.data.userid);
            toast('登录成功');
            loginOverlay.classList.remove('show');
            loadMyPage();
            loadHome();
            return true;
        }
        toast('登录失败：' + (res.message || '未知错误'), true);
        return false;
    }

    let qrTimer = null;
    async function startQR() {
        let keyRes = await request('/login/qr/key');
        let key = keyRes.data?.key;
        if (!key) {
            toast('获取二维码key失败', true);
            return;
        }
        let qrRes = await request('/login/qr/create', { key, qrimg: 1 });
        // 使用 qrcode_img 字段（完整的 data URL）
        let imgData = qrRes.data?.qrcode_img;
        if (!imgData) {
            toast('二维码生成失败：未返回图片数据', true);
            return;
        }
        let qrBox = document.querySelector('#loginQrBox');
        if (qrBox) {
            qrBox.innerHTML = `<img src="${imgData}" style="width:100%;height:auto;">`;
        }
        if (qrTimer) clearInterval(qrTimer);
        qrTimer = setInterval(async () => {
            let check = await request('/login/qr/check', { key });
            let status = check.data?.status;
            if (status === 4) {
                clearInterval(qrTimer);
                if (check.data?.token) {
                    saveAuth(check.data.token, check.data.userid);
                    toast('扫码登录成功');
                    loginOverlay.classList.remove('show');
                    loadMyPage();
                    loadHome();
                }
            } else if (status === 0) {
                clearInterval(qrTimer);
                toast('二维码已过期', true);
            } else if (status === 2) {
                if (qrBox) qrBox.innerHTML = '<span>已扫码，请确认</span>';
            }
        }, 2000);
    }
    function stopQR() { if (qrTimer) clearInterval(qrTimer); }

    // ---------- URL 提取辅助 ----------
    function extractPlayableUrl(res) {
        function findFirst(arr) {
            if (!Array.isArray(arr)) return null;
            for (let u of arr) {
                if (u && typeof u === 'string' && !u.includes('.mgg') && !u.includes('.mflac')) {
                    return u;
                }
            }
            return null;
        }

        if (res.url) return findFirst(res.url);
        if (res.backupUrl) return findFirst(res.backupUrl);
        if (Array.isArray(res.data) && res.data[0] && res.data[0].info && res.data[0].info.tracker_url) {
            return findFirst(res.data[0].info.tracker_url);
        }
        if (res.data && res.data.url) return findFirst(res.data.url);
        if (res.data && res.data.backupUrl) return findFirst(res.data.backupUrl);
        return null;
    }

    // 降级获取歌曲 URL
    async function getSongUrl(song) {
        const { hash, album_audio_id, album_id } = song;
        if (!hash) {
            toast('歌曲哈希缺失', true);
            return null;
        }

        // 320k
        toast('尝试 320k 链接...');
        let params320 = { hash, quality: '320' };
        if (album_audio_id) params320.album_audio_id = album_audio_id;
        if (album_id) params320.album_id = album_id;
        let res320 = await request('/song/url', params320);
        let url = extractPlayableUrl(res320);
        if (url) {
            toast('成功获取 320k 链接');
            return url;
        } else {
            toast('320k 失败（可能为 VIP 歌曲或无权限）', true);
        }

        // 128k
        toast('尝试 128k 链接...');
        let params128 = { hash, quality: '128' };
        if (album_audio_id) params128.album_audio_id = album_audio_id;
        if (album_id) params128.album_id = album_id;
        let res128 = await request('/song/url', params128);
        url = extractPlayableUrl(res128);
        if (url) {
            toast('成功获取 128k 链接');
            return url;
        } else {
            toast('128k 失败', true);
        }

        // 新版接口
        toast('尝试新版接口（试听）...');
        let resNew = await request('/song/url/new', { hash });
        url = extractPlayableUrl(resNew);
        if (url) {
            toast('成功获取新版试听链接');
            return url;
        } else {
            toast('新版接口未返回有效链接', true);
        }

        // 64k
        toast('尝试 64k 链接...');
        let params64 = { hash, quality: '64' };
        if (album_audio_id) params64.album_audio_id = album_audio_id;
        if (album_id) params64.album_id = album_id;
        let res64 = await request('/song/url', params64);
        url = extractPlayableUrl(res64);
        if (url) {
            toast('成功获取 64k 链接');
            return url;
        } else {
            toast('64k 失败', true);
        }

        // 正则暴力提取
        toast('尝试正则暴力提取...');
        let allResponses = [];
        for (let q of ['320', '128', '64']) {
            let params = { hash, quality: q };
            if (album_audio_id) params.album_audio_id = album_audio_id;
            if (album_id) params.album_id = album_id;
            let fullUrl = new URL('/song/url', API_BASE);
            params.timestamp = Date.now();
            params.cookie = `dfid=${DFID}`;
            if (TOKEN && USERID) params.cookie = `token=${TOKEN};userid=${USERID};dfid=${DFID}`;
            Object.keys(params).forEach(k => fullUrl.searchParams.set(k, params[k]));
            try {
                let resp = await fetch(fullUrl);
                let text = await resp.text();
                allResponses.push(text);
            } catch(e) {}
        }
        let fullUrlNew = new URL('/song/url/new', API_BASE);
        let newParams = { hash, timestamp: Date.now(), cookie: `dfid=${DFID}` };
        if (TOKEN && USERID) newParams.cookie = `token=${TOKEN};userid=${USERID};dfid=${DFID}`;
        Object.keys(newParams).forEach(k => fullUrlNew.searchParams.set(k, newParams[k]));
        try {
            let resp = await fetch(fullUrlNew);
            let text = await resp.text();
            allResponses.push(text);
        } catch(e) {}
        let fullText = allResponses.join('\n');
        let matches = fullText.match(/https?:\/\/[^\s"']+\.(mp3|flac)/gi);
        if (matches && matches.length) {
            matches.sort((a,b)=>a.length - b.length);
            toast('正则匹配成功');
            return matches[0];
        } else {
            toast('正则匹配失败：未找到任何 mp3/flac 链接', true);
            return null;
        }
    }

    async function playSong(song, playlist, idx) {
        if (!song.hash) { toast('歌曲标识缺失', true); return; }
        currentPlaylist = playlist;
        currentIndex = idx;
        let url = await getSongUrl(song);
        if (!url) { toast('无法获取播放链接', true); return; }

        audio.src = url;
        audio.crossOrigin = 'anonymous';
        try {
            await audio.play();
            playing = true;
            updateMiniBar(song);
            updatePlayerCover(song);
            startProgress();
            loadLyric(song.hash);
        } catch (e) {
            toast(`直接播放失败，尝试转换: ${e.message}`, true);
            try {
                let resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                let blob = await resp.blob();
                let blobUrl = URL.createObjectURL(blob);
                audio.src = blobUrl;
                await audio.play();
                playing = true;
                updateMiniBar(song);
                updatePlayerCover(song);
                startProgress();
                loadLyric(song.hash);
            } catch (e2) {
                toast('播放失败: ' + e2.message, true);
            }
        }
    }

    function updateMiniBar(song) {
        document.querySelector('#minibarTitle').textContent = `${song.name} - ${song.singer}`;
        setImage(document.querySelector('#minibarCover'), song.cover);
        document.querySelector('#minibarLyric').textContent = '播放中';
    }

    function updatePlayerCover(song) {
        setImage(document.querySelector('#playerCover'), song.cover);
    }

    function startProgress() {
        if (progressTimer) clearInterval(progressTimer);
        progressTimer = setInterval(() => {
            if (!playing) return;
            let cur = audio.currentTime;
            let dur = audio.duration || 0;
            document.querySelector('#playerTimeCur').textContent = formatTime(cur);
            document.querySelector('#playerTimeTotal').textContent = formatTime(dur);
            let percent = (cur / dur) * 100;
            document.querySelector('#playerProgressFill').style.width = percent + '%';
        }, 200);
    }

    function togglePlay() {
        if (playing) {
            audio.pause();
            playing = false;
        } else {
            audio.play().catch(e=>toast(e.message,true));
            playing = true;
        }
        updatePlayBtn();
    }

    function updatePlayBtn() {
        let icon = playing ? 'fa-pause' : 'fa-play';
        document.querySelector('#minibarPlayBtn i').className = `fas ${icon}`;
        document.querySelector('#playerMainPlay i').className = `fas ${icon}`;
    }

    function next() {
        if (!currentPlaylist.length) return;
        let idx = mode === 2 ? Math.floor(Math.random() * currentPlaylist.length) : (currentIndex + 1) % currentPlaylist.length;
        playSong(currentPlaylist[idx], currentPlaylist, idx);
    }

    function prev() {
        if (!currentPlaylist.length) return;
        let idx = mode === 2 ? Math.floor(Math.random() * currentPlaylist.length) : (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        playSong(currentPlaylist[idx], currentPlaylist, idx);
    }

    function cycleMode() {
        mode = (mode + 1) % 3;
        let btn = document.querySelector('#playerModeBtn');
        if (btn) btn.style.opacity = mode === 0 ? '0.5' : '1';
        let names = ['列表循环', '单曲循环', '随机'];
        toast(names[mode]);
    }

    async function loadLyric(hash) {
        try {
            let res = await request('/search/lyric', { hash });
            let cand = res.data?.candidates;
            if (!cand || !cand.length) return;
            let lyr = await request('/lyric', { id: cand[0].id, accesskey: cand[0].accesskey, fmt: 'lrc', decode: 'true' });
            if (lyr.data?.content) {
                let firstLine = lyr.data.content.split('\n')[0].replace(/\[.*?\]/, '').trim();
                if (firstLine) document.querySelector('#minibarLyric').textContent = firstLine;
            }
        } catch(e) {}
    }

    // ---------- UI 构建 (与之前相同，确保登录检查) ----------
    function buildUI() {
        const appDiv = document.getElementById('app');
        appDiv.innerHTML = `
            <div id="homePage" class="page active"></div>
            <div id="myPage" class="page"></div>
            <div id="playlistPage" class="page"></div>
            <div id="searchPage" class="search-page"></div>
            <div id="loginOverlay" class="login-overlay"></div>
            <div class="tabbar">
                <div class="tabbar-item" data-page="home"><i class="fas fa-home"></i><span>首页</span></div>
                <div class="tabbar-item" data-page="my"><i class="fas fa-user"></i><span>我的</span></div>
            </div>
            <div class="minibar" id="minibar">
                <div class="minibar-cover" id="minibarCover">---</div>
                <div class="minibar-info">
                    <div class="minibar-title" id="minibarTitle">未播放</div>
                    <div class="minibar-lyric" id="minibarLyric">点击播放</div>
                </div>
                <div class="minibar-btn" id="minibarPlayBtn"><i class="fas fa-play"></i></div>
            </div>
            <div class="player-full" id="fullPlayer">
                <div class="player-close" id="playerClose"><i class="fas fa-times"></i></div>
                <div class="player-cover" id="playerCover">---</div>
                <div class="player-progress-row">
                    <span class="player-time" id="playerTimeCur">00:00</span>
                    <div class="player-progress" id="playerProgressBar"><div class="player-progress-fill"></div></div>
                    <span class="player-time" id="playerTimeTotal">00:00</span>
                </div>
                <div class="player-controls">
                    <div class="player-ctrl-btn" id="playerModeBtn"><i class="fas fa-redo-alt"></i></div>
                    <div class="player-ctrl-btn" id="playerPrevBtn"><i class="fas fa-step-backward"></i></div>
                    <div class="player-ctrl-btn main-play" id="playerMainPlay"><i class="fas fa-play"></i></div>
                    <div class="player-ctrl-btn" id="playerNextBtn"><i class="fas fa-step-forward"></i></div>
                    <div class="player-ctrl-btn" id="playerListBtn"><i class="fas fa-list-ul"></i></div>
                </div>
                <div class="playlist-overlay" id="playlistOverlay">
                    <div class="playlist-panel" id="playlistPanel"></div>
                </div>
            </div>
        `;
        homePage = document.getElementById('homePage');
        myPage = document.getElementById('myPage');
        playlistPage = document.getElementById('playlistPage');
        searchPage = document.getElementById('searchPage');
        loginOverlay = document.getElementById('loginOverlay');
        minibar = document.getElementById('minibar');
        fullPlayer = document.getElementById('fullPlayer');

        document.querySelectorAll('.tabbar-item').forEach(t => {
            t.addEventListener('click', () => switchView(t.dataset.page));
        });
        minibar.addEventListener('click', () => showFullPlayer());
        document.getElementById('minibarPlayBtn').addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
        document.getElementById('playerClose').addEventListener('click', hideFullPlayer);
        document.getElementById('playerModeBtn').addEventListener('click', cycleMode);
        document.getElementById('playerPrevBtn').addEventListener('click', prev);
        document.getElementById('playerMainPlay').addEventListener('click', togglePlay);
        document.getElementById('playerNextBtn').addEventListener('click', next);
        document.getElementById('playerListBtn').addEventListener('click', showPlaylistPanel);
        document.getElementById('playerProgressBar').addEventListener('click', seekProgress);
        document.getElementById('playlistOverlay').addEventListener('click', (e) => { if(e.target.id === 'playlistOverlay') hidePlaylistPanel(); });

        buildHomePage();
        buildSearchPage();
        buildLoginDialog();
    }

    function switchView(view) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(view+'Page').classList.add('active');
        document.querySelectorAll('.tabbar-item').forEach(t => t.classList.toggle('active', t.dataset.page === view));
        if (view === 'my') loadMyPage();
    }

    function showFullPlayer() {
        fullPlayer.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    function hideFullPlayer() {
        fullPlayer.classList.remove('show');
        document.body.style.overflow = '';
    }
    function showPlaylistPanel() {
        let panel = document.getElementById('playlistPanel');
        panel.innerHTML = '';
        currentPlaylist.forEach((s, i) => {
            let div = document.createElement('div');
            div.className = 'playlist-item' + (i === currentIndex ? ' current' : '');
            div.innerHTML = `<div>${i+1}</div><div><div>${s.name}</div><div>${s.singer}</div></div>`;
            div.onclick = () => { playSong(s, currentPlaylist, i); hidePlaylistPanel(); };
            panel.appendChild(div);
        });
        document.getElementById('playlistOverlay').classList.add('show');
    }
    function hidePlaylistPanel() { document.getElementById('playlistOverlay').classList.remove('show'); }
    function seekProgress(e) {
        let bar = document.getElementById('playerProgressBar');
        let rect = bar.getBoundingClientRect();
        let percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = audio.duration * Math.min(1, Math.max(0, percent));
    }

    // 首页
    async function buildHomePage() {
        homePage.innerHTML = `
            <div class="search-bar" id="homeSearch"><i class="fas fa-search"></i><span>搜索音乐</span></div>
            <div><div class="section-title">每日推荐</div><div class="scroll-h" id="dailyScroll"></div></div>
            <div><div class="section-title">猜你喜欢</div><div class="song-list" id="fmList"></div></div>
            <div><div class="section-title">新歌速递</div><div class="song-list" id="hotList"></div></div>
        `;
        document.getElementById('homeSearch').onclick = () => searchPage.classList.add('show');
        await loadHome();
    }

    async function loadHome() {
        try {
            let daily = await request('/everyday/recommend', { platform: 'ios' });
            let fm = await request('/personal/fm', { mode: 'normal' });
            let hot = await request('/top/song');
            renderScroll('dailyScroll', daily.data?.song_list || []);
            renderList('fmList', fm.data?.song_list || []);
            renderList('hotList', (hot.data || []).slice(0,20));
        } catch(e) { toast('首页加载失败', true); }
    }

    function renderScroll(containerId, songs) {
        let container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        songs.forEach(s => {
            let song = normalizeSong(s);
            let card = document.createElement('div');
            card.className = 'song-card';
            card.onclick = () => playSong(song, songs.map(normalizeSong), songs.indexOf(s));
            card.innerHTML = `
                <div class="cover">${song.cover ? `<img src="${imgUrl(song.cover)}">` : '---'}</div>
                <div class="name">${song.name}</div>
                <div class="singer">${song.singer}</div>
            `;
            container.appendChild(card);
        });
    }

    function renderList(containerId, songs) {
        let container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        songs.forEach((s, idx) => {
            let song = normalizeSong(s);
            let div = document.createElement('div');
            div.className = 'song-item';
            div.onclick = () => playSong(song, songs.map(normalizeSong), idx);
            div.innerHTML = `<div class="index">${idx+1}</div><div class="info"><div class="name">${song.name}</div><div class="singer">${song.singer}</div></div>`;
            container.appendChild(div);
        });
    }

    function normalizeSong(raw) {
        let name = raw.SongName || raw.songname || raw.name || raw.FileName || '未知';
        let singer = raw.SingerName || raw.author_name || raw.singer || raw.author || (raw.authors?.[0]?.author_name) || '';
        let hash = raw.FileHash || raw.hash || (raw.HQ?.Hash) || raw.hash_320 || raw.hash_128 || '';
        let cover = raw.Image || raw.album_sizable_cover || raw.cover || raw.imgurl || raw.trans_param?.union_cover || '';
        let album_audio_id = raw.album_audio_id || raw.mixsongid || raw.Audioid || '';
        let album_id = raw.album_id || raw.AlbumID || '';
        return { name, singer, hash, cover, album_audio_id, album_id };
    }

    // 我的页面
    async function loadMyPage() {
        if (!TOKEN) { toast('请先登录'); loginOverlay.classList.add('show'); return; }
        myPage.innerHTML = `<div style="padding:40px;text-align:center;">加载中...</div>`;
        try {
            let [user, vip, playlists] = await Promise.all([
                request('/user/detail'),
                request('/user/vip/detail'),
                request('/user/playlist')
            ]);
            let u = user.data || {};
            let v = vip.data || {};
            let pls = playlists.data?.info || [];
            myPage.innerHTML = `
                <div class="my-header">
                    <div class="my-avatar" id="myAvatar">${u.pic ? `<img src="${imgUrl(u.pic,120)}">` : '---'}</div>
                    <div class="my-info">
                        <div class="my-nickname">${u.nickname || '用户'}</div>
                        <div class="my-meta">关注 ${u.follows||0}  |  粉丝 ${u.fans||0}</div>
                        ${v.is_vip ? '<div class="my-vip">VIP</div>' : ''}
                    </div>
                </div>
                <div class="my-detail-toggle" id="detailToggle">详细信息 <i class="fas fa-chevron-down"></i></div>
                <div class="my-detail-content" id="detailContent"></div>
                <div id="myPlaylist"></div>
            `;
            let detailRows = [
                ['昵称', u.nickname], ['所在地', u.loc || '未知'], ['性别', u.gender===1?'男':u.gender===2?'女':'未设置'],
                ['简介', u.descri || '无'], ['VIP类型', v.vip_type], ['VIP到期', v.vip_end_time || '--']
            ];
            let cont = document.getElementById('detailContent');
            detailRows.forEach(([l,val]) => {
                let row = document.createElement('div');
                row.className = 'detail-row';
                row.innerHTML = `<span>${l}</span><span>${val||'--'}</span>`;
                cont.appendChild(row);
            });
            document.getElementById('detailToggle').onclick = () => {
                document.getElementById('detailContent').classList.toggle('show');
            };
            let plContainer = document.getElementById('myPlaylist');
            pls.forEach(pl => {
                let div = document.createElement('div');
                div.className = 'playlist-item';
                div.onclick = () => openPlaylist(pl);
                div.innerHTML = `<div class="playlist-cover">${pl.pic ? `<img src="${imgUrl(pl.pic,100)}">` : '---'}</div><div><div>${pl.name}</div><div>${pl.count}首</div></div>`;
                plContainer.appendChild(div);
            });
        } catch(e) { toast('加载我的页面失败', true); }
    }

    // 歌单预览（从新到旧分页）
    async function openPlaylist(pl) {
        currentPlaylistId = pl.listid;
        currentPlaylistTotal = pl.count;
        currentPlaylistMaxPage = Math.ceil(currentPlaylistTotal / 50);
        currentPlaylistPage = currentPlaylistMaxPage;
        playlistSongs = [];
        playlistPage.innerHTML = `
            <div style="display:flex;padding:12px 16px;gap:12px;border-bottom:1px solid var(--border-subtle);">
                <div style="cursor:pointer;" id="plBack"><i class="fas fa-arrow-left"></i></div>
                <div style="flex:1;">${pl.name} (${currentPlaylistTotal}首)</div>
                <div style="cursor:pointer;color:var(--accent);" id="plPlayAll">全部播放</div>
            </div>
            <div class="song-list" id="plSongList"></div>
            <div id="plLoadMore" style="text-align:center;padding:14px;"></div>
        `;
        document.getElementById('plBack').onclick = () => switchView('my');
        document.getElementById('plPlayAll').onclick = () => { if(playlistSongs.length) playSong(playlistSongs[0], playlistSongs, 0); };
        switchView('playlist');
        await loadPlaylistPage();
        let listEl = document.getElementById('plSongList');
        listEl.addEventListener('scroll', () => {
            if(listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 80 && !playlistLoading && currentPlaylistPage > 1) {
                loadPlaylistPage();
            }
        });
    }

    async function loadPlaylistPage() {
        if (playlistLoading) return;
        playlistLoading = true;
        let loadHint = document.getElementById('plLoadMore');
        if (loadHint) loadHint.textContent = '加载中...';
        try {
            let res = await request('/playlist/track/all/new', { listid: currentPlaylistId, page: currentPlaylistPage, pagesize: 50 });
            let rows = res.data?.info || [];
            if (rows.length) {
                let mapped = rows.map(r => normalizeSong(r)).reverse();
                playlistSongs = [...playlistSongs, ...mapped];
                renderPlaylistSongs();
                currentPlaylistPage--;
            }
        } catch(e) { toast('歌单加载失败', true); }
        if (loadHint) loadHint.textContent = currentPlaylistPage < 1 ? '已加载全部' : '上滑加载更多';
        playlistLoading = false;
    }

    function renderPlaylistSongs() {
        let listEl = document.getElementById('plSongList');
        if (!listEl) return;
        listEl.innerHTML = '';
        playlistSongs.forEach((s, idx) => {
            let div = document.createElement('div');
            div.className = 'song-item';
            div.onclick = () => playSong(s, playlistSongs, idx);
            div.innerHTML = `<div class="index">${idx+1}</div><div class="info"><div class="name">${s.name}</div><div class="singer">${s.singer}</div></div>`;
            listEl.appendChild(div);
        });
    }

    // 搜索
    function buildSearchPage() {
        searchPage.innerHTML = `
            <div class="search-top">
                <input class="search-input" id="searchInput" placeholder="搜索歌曲">
                <span class="search-cancel" id="searchCancel">取消</span>
            </div>
            <div class="search-results song-list" id="searchResults"></div>
        `;
        let input = document.getElementById('searchInput');
        input.addEventListener('input', async () => {
            let kw = input.value.trim();
            let resDiv = document.getElementById('searchResults');
            if (!kw) { resDiv.innerHTML = ''; return; }
            resDiv.innerHTML = '<div style="padding:20px;">搜索中...</div>';
            try {
                let data = await request('/search', { keywords: kw, type: 'song', page: 1, pagesize: 20 });
                let songs = data.data?.lists || [];
                if (!songs.length) { resDiv.innerHTML = '<div style="padding:20px;">未找到</div>'; return; }
                let normalized = songs.map(normalizeSong);
                resDiv.innerHTML = '';
                normalized.forEach((s, i) => {
                    let div = document.createElement('div');
                    div.className = 'song-item';
                    div.onclick = () => playSong(s, normalized, i);
                    div.innerHTML = `<div class="index">${i+1}</div><div class="info"><div class="name">${s.name}</div><div class="singer">${s.singer}</div></div>`;
                    resDiv.appendChild(div);
                });
            } catch(e) { resDiv.innerHTML = '<div style="padding:20px;">搜索失败</div>'; }
        });
        document.getElementById('searchCancel').onclick = () => {
            searchPage.classList.remove('show');
            input.value = '';
            document.getElementById('searchResults').innerHTML = '';
        };
    }

    // 登录弹窗（不可关闭）
    function buildLoginDialog() {
        loginOverlay.innerHTML = `
            <div class="login-dialog">
                <div class="login-tabs">
                    <span class="login-tab active" data-idx="0">验证码</span>
                    <span class="login-tab" data-idx="1">扫码</span>
                    <span class="login-tab" data-idx="2">密码</span>
                    <div class="login-tab-slider"></div>
                </div>
                <div data-panel="0">
                    <input class="login-input" id="loginMobile" placeholder="手机号">
                    <input class="login-input" id="loginCode" placeholder="验证码">
                    <div class="login-send-btn" id="loginSendBtn">获取验证码</div>
                </div>
                <div data-panel="1" style="display:none;">
                    <div class="login-qr" id="loginQrBox">二维码</div>
                </div>
                <div data-panel="2" style="display:none;">
                    <input class="login-input" id="loginUser" placeholder="用户名">
                    <input class="login-input" id="loginPass" placeholder="密码" type="password">
                </div>
                <button class="login-submit" id="loginSubmit">登录</button>
            </div>
        `;
        let loginTab = 0;
        let tabs = document.querySelectorAll('.login-tab');
        let panels = document.querySelectorAll('[data-panel]');
        let slider = document.querySelector('.login-tab-slider');
        function updateSlider() {
            let active = tabs[loginTab];
            slider.style.left = active.offsetLeft + 'px';
            slider.style.width = active.offsetWidth + 'px';
        }
        tabs.forEach((t,i) => t.addEventListener('click', () => {
            loginTab = i;
            tabs.forEach((tt,ii)=>tt.classList.toggle('active', ii===i));
            panels.forEach(p=>p.style.display = parseInt(p.dataset.panel)===i ? 'block' : 'none');
            updateSlider();
            if (i===1) startQR();
            else if (i!==1 && qrTimer) stopQR();
        }));
        updateSlider();

        // 绑定发送按钮
        const sendBtn = document.getElementById('loginSendBtn');
        if (sendBtn) {
            sendBtn.onclick = async () => {
                const mobile = document.getElementById('loginMobile').value;
                if (!mobile) { toast('输入手机号'); return; }
                await sendCode(mobile);
            };
        }

        const submitBtn = document.getElementById('loginSubmit');
        if (submitBtn) {
            submitBtn.onclick = async () => {
                if (loginTab === 0) {
                    let mobile = document.getElementById('loginMobile').value;
                    let code = document.getElementById('loginCode').value;
                    if (!mobile || !code) { toast('请填写完整'); return; }
                    await loginWithCode(mobile, code);
                } else if (loginTab === 2) {
                    let user = document.getElementById('loginUser').value;
                    let pass = document.getElementById('loginPass').value;
                    if (!user || !pass) { toast('请填写完整'); return; }
                    await loginWithPassword(user, pass);
                }
            };
        }
    }

    // 启动
    async function init() {
        await ensureDfid();
        loadAuth();
        buildUI();
        if (!TOKEN) {
            loginOverlay.classList.add('show');
        } else {
            loadHome();
            loadMyPage();
        }
        // 主题自动切换
        let hour = new Date().getHours();
        let isLight = hour >= 6 && hour < 18;
        document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
        setInterval(() => {
            let h = new Date().getHours();
            let light = h >= 6 && h < 18;
            document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
        }, 60000);
    }

    init();
})();