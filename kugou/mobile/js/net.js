'use strict';

const Net = (() => {
    const BASE = 'https://kapi.344977.xyz';

    function getAuth() {
        const a = Tool.storage.get('auth');
        const d = Tool.storage.get('dfid') || '';
        if (!a || !a.token) return '';
        return `token=${a.token};userid=${a.userid||''};dfid=${d}`;
    }

    async function request(path, params = {}) {
        const all = { ...params, timestamp: Date.now() };
        const cookie = getAuth();
        if (cookie) all.cookie = cookie;

        const url = new URL(path, BASE);
        Object.entries(all).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
        });

        const headers = {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        };
        try {
            const resp = await fetch(url, { headers });
            const json = await resp.json();
            return json;
        } catch (e) {
            console.error(e);
            return { status: 0, error_code: -1 };
        }
    }

    function ok(res) { return res && res.status === 1 && res.error_code === 0; }

    function extractSongUrl(res) {
        if (!ok(res) || !res.data) return '';
        const d = res.data;
        if (d.url && Array.isArray(d.url) && d.url.length) return d.url[0];
        if (d.backupUrl && Array.isArray(d.backupUrl) && d.backupUrl.length) return d.backupUrl[0];
        if (Array.isArray(res.data) && res.data[0] && res.data[0].info && res.data[0].info.tracker_url) {
            const urls = res.data[0].info.tracker_url;
            if (urls.length) return urls[0];
        }
        return '';
    }

    function saveDfid(dfid) { if (dfid) Tool.storage.set('dfid', dfid); }
    function saveAuth(d) { Tool.storage.set('auth', { token: d.token, userid: d.userid, nickname: d.nickname, pic: d.pic }); }
    function clearAuth() { Tool.storage.remove('auth'); Tool.storage.remove('dfid'); }
    function isLogin() { const a = Tool.storage.get('auth'); return !!(a && a.token); }
    function getAuthInfo() { return Tool.storage.get('auth') || {}; }

    return { request, ok, extractSongUrl, saveDfid, saveAuth, clearAuth, isLogin, getAuthInfo };
})();