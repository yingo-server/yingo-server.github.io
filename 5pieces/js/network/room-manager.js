import { giteeGetFile, giteeCreateFile, giteeUpdateFile, giteeDeleteFile } from './gitee-api.js';

// 自定义房间错误
class RoomError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'RoomError';
        this.code = code;
    }
}

// 生成随机五位数房间号
function generateRoomId() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

/**
 * 创建房间
 */
export async function createRoom(roomName, playerName) {
    try {
        const listFile = await giteeGetFile('rooms/list.txt');
        let existingIds = new Set();
        if (listFile) {
            const lines = listFile.content.trim().split('\n').filter(line => line);
            lines.forEach(line => {
                const parts = line.split('!');
                if (parts.length >= 2) existingIds.add(parts[1]);
            });
        }

        let roomId;
        do {
            roomId = generateRoomId();
        } while (existingIds.has(roomId));

        const vsPath = `rooms/${roomId}/vs.txt`;
        const vsContent = `blackis=${playerName}!white=\n`;
        const created = await giteeCreateFile(vsPath, vsContent, `创建房间 ${roomName}`);
        if (!created) {
            throw new RoomError('CREATE_FAILED', '创建房间文件失败');
        }

        const listEntry = `${roomName}!${roomId}`;
        let newListContent = listEntry + '\n';
        if (listFile) {
            newListContent = listFile.content + listEntry + '\n';
            await giteeUpdateFile('rooms/list.txt', newListContent, listFile.sha, '添加房间');
        } else {
            await giteeCreateFile('rooms/list.txt', newListContent, '创建房间列表');
        }
        return roomId;
    } catch (e) {
        throw e;
    }
}

/**
 * 加入房间（作为白方）
 */
export async function joinRoom(roomId, playerName) {
    try {
        const vsPath = `rooms/${roomId}/vs.txt`;
        const vsFile = await giteeGetFile(vsPath);
        if (!vsFile) {
            throw new RoomError('ROOM_NOT_FOUND', '房间不存在');
        }

        const lines = vsFile.content.split('\n');
        const header = lines[0];
        const match = header.match(/blackis=([^!]*)!white=(.*)/);
        if (!match) {
            throw new RoomError('INVALID_ROOM_DATA', '房间数据格式错误');
        }
        const [, black, white] = match;
        if (white !== '') {
            throw new RoomError('ROOM_FULL', '房间已满（白方已存在）');
        }

        lines[0] = `blackis=${black}!white=${playerName}`;
        const newContent = lines.join('\n');
        const success = await giteeUpdateFile(vsPath, newContent, vsFile.sha, '玩家加入');
        if (!success) {
            throw new RoomError('JOIN_FAILED', '加入房间失败');
        }
        return true;
    } catch (e) {
        throw e;
    }
}

/**
 * 获取房间信息
 */
export async function getRoomInfo(roomId) {
    try {
        const vsFile = await giteeGetFile(`rooms/${roomId}/vs.txt`);
        if (!vsFile) return null;

        const lines = vsFile.content.trim().split('\n');
        const header = lines[0];
        const match = header.match(/blackis=([^!]*)!white=(.*)/);
        if (!match) return null;
        const [, black, white] = match;
        const moves = [];
        let gameOver = false;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === 'gg') {
                gameOver = true;
                break;
            }
            if (line) moves.push(line);
        }
        return { black, white, moves, gameOver };
    } catch (e) {
        throw e;
    }
}

/**
 * 落子
 */
export async function addMove(roomId, row, col, playerName, gameOver = false) {
    try {
        const vsPath = `rooms/${roomId}/vs.txt`;
        const vsFile = await giteeGetFile(vsPath);
        if (!vsFile) {
            throw new RoomError('ROOM_NOT_FOUND', '房间不存在');
        }

        const lines = vsFile.content.split('\n');
        const moveCount = lines.filter(l => l && l !== 'gg' && !l.startsWith('blackis=')).length;
        const isBlackTurn = moveCount % 2 === 0;
        const header = lines[0];
        const match = header.match(/blackis=([^!]*)!white=(.*)/);
        if (!match) {
            throw new RoomError('INVALID_ROOM_DATA', '房间数据格式错误');
        }
        const [, black, white] = match;
        const expectedPlayer = isBlackTurn ? black : white;
        if (expectedPlayer !== playerName) {
            throw new RoomError('NOT_YOUR_TURN', '不是你的回合');
        }

        if (lines[lines.length - 1] === 'gg') lines.pop();

        lines.push(`${row},${col}`);
        if (gameOver) lines.push('gg');
        const newContent = lines.join('\n');
        const success = await giteeUpdateFile(vsPath, newContent, vsFile.sha, `落子 ${row},${col}`);
        if (!success) {
            throw new RoomError('MOVE_FAILED', '落子失败，请重试');
        }
        return true;
    } catch (e) {
        throw e;
    }
}

/**
 * 获取所有房间列表
 */
export async function getRoomList() {
    try {
        const listFile = await giteeGetFile('rooms/list.txt');
        if (!listFile) return [];
        return listFile.content.trim().split('\n').filter(line => line).map(line => {
            const [name, id] = line.split('!');
            return { name, id };
        });
    } catch (e) {
        throw e;
    }
}

/**
 * 删除房间（销毁）
 */
export async function deleteRoom(roomId) {
    try {
        // 获取 vs.txt 的 sha
        const vsFile = await giteeGetFile(`rooms/${roomId}/vs.txt`);
        if (!vsFile) return false;
        // 删除 vs.txt
        await giteeDeleteFile(`rooms/${roomId}/vs.txt`, vsFile.sha, `删除房间 ${roomId}`);

        // 更新 list.txt，移除该房间
        const listFile = await giteeGetFile('rooms/list.txt');
        if (listFile) {
            const lines = listFile.content.split('\n').filter(line => line);
            const newLines = lines.filter(line => !line.endsWith(`!${roomId}`));
            const newContent = newLines.join('\n') + (newLines.length ? '\n' : '');
            await giteeUpdateFile('rooms/list.txt', newContent, listFile.sha, `删除房间 ${roomId}`);
        }
        return true;
    } catch (e) {
        console.error('删除房间失败', e);
        throw e;
    }
}