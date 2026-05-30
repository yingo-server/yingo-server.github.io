// 网络通信模块 (Gitee API)
const NET_CONFIG = {
    token: '36079a70cc1fbac56f6846d99653405a',
    owner: 'yingo-server',
    repo: 'chess',
    baseUrl: 'https://gitee.com/api/v5'
};

function base64Encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
}
function base64Decode(str) {
    return atob(str);
}

async function apiRequest(method, path, body = null) {
    const url = `${NET_CONFIG.baseUrl}/repos/${NET_CONFIG.owner}/${NET_CONFIG.repo}/contents/${path}`;
    const headers = {
        'Authorization': `token ${NET_CONFIG.token}`,
        'Content-Type': 'application/json'
    };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(url, options);
    return response.json();
}

class NetworkManager {
    constructor() {
        this.roomId = null;
        this.role = null;
        this.password = null;
        this.uuid = this.generateUUID();
        this.pollTimer = null;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random()*16|0;
            return (c==='x' ? r : (r&0x3|0x8)).toString(16);
        });
    }

    generateRoomId() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
        return id;
    }

    generatePassword() {
        const hex = '0123456789abcdef';
        let pass = '';
        for (let i = 0; i < 16; i++) pass += hex[Math.floor(Math.random() * 16)];
        return pass;
    }

    async createRoom() {
        let attempts = 0;
        while (attempts++ < 3) {
            this.roomId = this.generateRoomId();
            this.password = this.generatePassword();
            const lockRes = await apiRequest('POST', `rooms/${this.roomId}/white.lock`, {
                content: base64Encode(this.password),
                message: 'create room'
            });
            if (lockRes.message?.includes('already exists') || lockRes.status === 422) continue;
            const data = {
                status: 'waiting',
                white: this.uuid,
                black: null,
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                moveHistory: [],
                lastMoveTime: new Date().toISOString(),
                result: null,
                moveCount: 1
            };
            const dataRes = await apiRequest('POST', `rooms/${this.roomId}/data.json`, {
                content: base64Encode(JSON.stringify(data)),
                message: 'init game'
            });
            if (dataRes.content) {
                this.role = 'white';
                return true;
            } else {
                try { await apiRequest('DELETE', `rooms/${this.roomId}/white.lock`, { sha: lockRes.sha, message: 'clean' }); } catch(e) {}
            }
        }
        throw new Error('创建房间失败，请稍后重试');
    }

    async joinRoom(roomId) {
        this.roomId = roomId;
        const dataFile = await apiRequest('GET', `rooms/${roomId}/data.json`);
        if (dataFile.message?.includes('Not Found')) throw new Error('房间不存在');
        const data = JSON.parse(base64Decode(dataFile.content));
        if (data.status !== 'waiting' || data.black) throw new Error('房间已满或已开始');
        this.password = this.generatePassword();
        data.black = this.uuid;
        data.status = 'playing';
        data.lastMoveTime = new Date().toISOString();
        const updateRes = await apiRequest('PUT', `rooms/${roomId}/data.json`, {
            content: base64Encode(JSON.stringify(data)),
            sha: dataFile.sha,
            message: 'join'
        });
        if (updateRes.message?.includes('sha')) throw new Error('加入失败，请重试');
        await apiRequest('POST', `rooms/${roomId}/black.lock`, {
            content: base64Encode(this.password),
            message: 'black lock'
        });
        this.role = 'black';
        return true;
    }

    async pollData() {
        const dataFile = await apiRequest('GET', `rooms/${this.roomId}/data.json`);
        const data = JSON.parse(base64Decode(dataFile.content));
        return { sha: dataFile.sha, data };
    }

    async updateData(fen, moveHistory, result, status, moveCount) {
        let retries = 0;
        while (retries < 3) {
            const getRes = await apiRequest('GET', `rooms/${this.roomId}/data.json`);
            const current = JSON.parse(base64Decode(getRes.content));
            current.fen = fen;
            current.moveHistory = moveHistory;
            if (result) current.result = result;
            if (status) current.status = status;
            if (moveCount !== undefined) current.moveCount = moveCount;
            current.lastMoveTime = new Date().toISOString();
            const updateRes = await apiRequest('PUT', `rooms/${this.roomId}/data.json`, {
                content: base64Encode(JSON.stringify(current)),
                sha: getRes.sha,
                message: 'move'
            });
            if (!updateRes.message || !updateRes.message.includes('sha')) {
                return updateRes;
            }
            retries++;
        }
        throw new Error('更新失败，SHA冲突重试耗尽');
    }

    async deleteRoom() {
        const files = ['data.json', 'white.lock', 'black.lock'];
        for (const f of files) {
            try {
                const info = await apiRequest('GET', `rooms/${this.roomId}/${f}`);
                if (info.sha) await apiRequest('DELETE', `rooms/${this.roomId}/${f}`, { sha: info.sha, message: 'clean' });
            } catch(e) {}
        }
    }

    async verifyPassword(role) {
        const file = role === 'white' ? 'white.lock' : 'black.lock';
        const res = await apiRequest('GET', `rooms/${this.roomId}/${file}`);
        if (res.message) return false;
        return base64Decode(res.content) === this.password;
    }
}