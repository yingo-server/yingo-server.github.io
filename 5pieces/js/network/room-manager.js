import { giteeGetFile, giteeCreateFile, giteeUpdateFile } from './gitee-api.js';

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
 * @param {string} roomName 房间名称
 * @param {string} playerName 黑方玩家名
 * @returns {Promise<string | null>} 房间号，失败返回 null
 */
export async function createRoom(roomName, playerName) {
    try {
        // 获取现有房间列表，避免房间号重复
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

        // 创建房间文件夹（通过创建 vs.txt 隐式创建目录）
        const vsPath = `rooms/${roomId}/vs.txt`;
        const vsContent = `blackis=${playerName}!white=\n`;
        const created = await giteeCreateFile(vsPath, vsContent, `创建房间 ${roomName}`);
        if (!created) {
            throw new RoomError('CREATE_FAILED', '创建房间文件失败');
        }

        // 更新 rooms/list.txt
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
 * @param {string} roomId 房间号
 * @param {string} playerName 白方玩家名
 * @returns {Promise<boolean>} 是否成功加入
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

        // 更新第一行
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
 * 获取房间信息（解析 vs.txt）
 * @param {string} roomId
 * @returns {Promise<{ black: string, white: string, moves: string[], gameOver: boolean } | null>}
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
 * 落子并更新 vs.txt
 * @param {string} roomId
 * @param {number} row
 * @param {number} col
 * @param {string} playerName 当前落子的玩家名（用于校验）
 * @param {boolean} gameOver 是否游戏结束（落子后检测到结束可附加 gg）
 * @returns {Promise<boolean>}
 */
export async function addMove(roomId, row, col, playerName, gameOver = false) {
    try {
        const vsPath = `rooms/${roomId}/vs.txt`;
        const vsFile = await giteeGetFile(vsPath);
        if (!vsFile) {
            throw new RoomError('ROOM_NOT_FOUND', '房间不存在');
        }

        const lines = vsFile.content.split('\n');
        // 校验玩家身份：根据现有行数判断该谁下
        const moveCount = lines.filter(l => l && l !== 'gg' && !l.startsWith('blackis=')).length;
        const isBlackTurn = moveCount % 2 === 0; // 0 是黑
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

        // 移除末尾可能的 gg
        if (lines[lines.length - 1] === 'gg') lines.pop();

        // 追加落子
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
 * 获取所有房间列表（用于观战）
 * @returns {Promise<Array<{ name: string, id: string }>>}
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