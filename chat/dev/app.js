// app.js - Material Chat 房间式聊天 (TextDB后端)
// 配置
const ROOM_LIST_KEY = '3449776312';           // 固定key存储房间列表
const TEXTDB_BASE = 'https://textdb.online';
const UPDATE_URL = `${TEXTDB_BASE}/update/`;
const REFRESH_INTERVAL = 4000;                // 4秒轮询新消息
const MAX_MESSAGES = 300;

// 用户身份 (沿用原逻辑)
let userId = localStorage.getItem('chat_userId');
if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chat_userId', userId);
}
let username = localStorage.getItem('chat_username');
if (!username) {
    const nameList = ['墨客', '听雨', '观星', '拾光', '远山'];
    username = nameList[Math.floor(Math.random() * nameList.length)] + Math.floor(Math.random()*100);
    localStorage.setItem('chat_username', username);
}

// 全局状态
let rooms = [];                                 // { name, key }
let currentRoomKey = null;
let currentRoomName = '';
let messages = [];
let refreshTimer = null;
let isSending = false;
let statusDot = document.getElementById('statusDot');
let statusText = document.getElementById('statusText');

// DOM 元素
const roomsListEl = document.getElementById('roomsList');
const messagesListEl = document.getElementById('messagesList');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const usernameDisplay = document.getElementById('usernameDisplay');
const userProfile = document.getElementById('userProfile');
const currentRoomNameEl = document.getElementById('currentRoomName');
const errorSnackbar = document.getElementById('errorSnackbar');
const messagesContainer = document.getElementById('messagesContainer');

usernameDisplay.textContent = username;

// ========== TextDB 封装 ==========
async function textdbGet(key) {
    try {
        const res = await fetch(`${TEXTDB_BASE}/${key}`);
        if (res.ok) return await res.text();
        return null;
    } catch {
        return null;
    }
}
async function textdbUpdate(key, value) {
    try {
        const formData = new URLSearchParams({ key, value });
        const res = await fetch(UPDATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        const json = await res.json();
        return json.status === 1;
    } catch {
        return false;
    }
}

// ========== 房间列表操作 ==========
async function loadRoomList() {
    const raw = await textdbGet(ROOM_LIST_KEY);
    if (!raw) return [];
    // 格式: !房间名=key!!房间名=key!  过滤空串
    const parts = raw.split('!').filter(p => p.trim() !== '');
    return parts.map(p => {
        const eq = p.indexOf('=');
        if (eq === -1) return null;
        return { name: p.substring(0, eq), key: p.substring(eq + 1) };
    }).filter(r => r && r.name && r.key);
}
async function saveRoomList(roomsArray) {
    let str = '';
    roomsArray.forEach(r => { str += `!${r.name}=${r.key}`; });
    str += '!';   // 保证前后包裹
    return textdbUpdate(ROOM_LIST_KEY, str);
}

// ========== 消息操作 ==========
async function loadMessages(roomKey) {
    const data = await textdbGet(roomKey);
    if (!data) return [];
    try {
        const arr = JSON.parse(data);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}
async function saveMessages(roomKey, msgs) {
    return textdbUpdate(roomKey, JSON.stringify(msgs));
}

// ========== 辅助函数 ==========
function formatTime(timestamp) {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function showError(msg, duration = 3000) {
    errorSnackbar.textContent = msg;
    errorSnackbar.classList.add('show');
    setTimeout(() => errorSnackbar.classList.remove('show'), duration);
}
function updateStatus(online = true, error = false) {
    if (!online) {
        statusDot.className = 'status-dot offline';
        statusText.textContent = '离线';
    } else if (error) {
        statusDot.className = 'status-dot error';
        statusText.textContent = '异常';
    } else {
        statusDot.className = 'status-dot';
        statusText.textContent = '在线';
    }
}

// 生成30位纯数字key并检测是否可用
async function generateUniqueRoomKey() {
    for (let attempt = 0; attempt < 50; attempt++) {
        const key = Array.from({ length: 30 }, () => Math.floor(Math.random() * 10)).join('');
        const existing = await textdbGet(key);
        // 如果key不存在或内容为空字符串，视为可用 (注意textdbGet返回null或字符串)
        if (existing === null || existing.trim() === '') {
            return key;
        }
    }
    throw new Error('无法生成可用的房间号，请稍后重试');
}

// 初始化默认房间 (如果列表为空)
async function ensureDefaultRoom() {
    if (rooms.length === 0) {
        const defaultName = '默认聊天室';
        const newKey = await generateUniqueRoomKey();
        // 初始化空消息数组
        await saveMessages(newKey, []);
        rooms.push({ name: defaultName, key: newKey });
        await saveRoomList(rooms);
    }
}

// ========== 渲染房间列表 ==========
function renderRooms() {
    if (rooms.length === 0) {
        roomsListEl.innerHTML = '<div class="loading-placeholder">暂无房间，点击右上角➕创建</div>';
        return;
    }
    let html = '';
    rooms.forEach(r => {
        const activeClass = (r.key === currentRoomKey) ? 'active' : '';
        html += `
            <div class="room-item ${activeClass}" data-key="${r.key}" data-name="${escapeHtml(r.name)}">
                <span class="material-icons">chat</span>
                <span class="room-name">${escapeHtml(r.name)}</span>
            </div>
        `;
    });
    roomsListEl.innerHTML = html;
    // 绑定点击事件
    document.querySelectorAll('.room-item').forEach(el => {
        el.addEventListener('click', (e) => {
            const key = el.dataset.key;
            const name = el.dataset.name;
            switchRoom(key, name);
        });
    });
}

// ========== 切换房间 ==========
async function switchRoom(roomKey, roomName) {
    if (roomKey === currentRoomKey) return;
    currentRoomKey = roomKey;
    currentRoomName = roomName;
    currentRoomNameEl.textContent = roomName;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();

    // 重新渲染房间列表高亮
    renderRooms();

    // 加载消息
    await loadAndRenderMessages();

    // 重启轮询 (清除旧定时器)
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        if (currentRoomKey) loadAndRenderMessages(false); // 静默刷新
    }, REFRESH_INTERVAL);
}

// 加载并渲染消息 (scrollControl: 是否自动滚底)
async function loadAndRenderMessages(scrollToBottom = true) {
    if (!currentRoomKey) return;
    try {
        const newMessages = await loadMessages(currentRoomKey);
        // 去重合并 (简单替换)
        messages = newMessages.slice(-MAX_MESSAGES);
        renderMessages();
        if (scrollToBottom) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        updateStatus(true);
    } catch (e) {
        updateStatus(true, true);
    }
}

function renderMessages() {
    if (messages.length === 0) {
        messagesListEl.innerHTML = '<div class="system-message">✨ 暂无消息，发送第一条吧</div>';
        return;
    }
    let html = '';
    messages.forEach(msg => {
        const isOwn = msg.userId === userId;
        const msgClass = isOwn ? 'own' : '';
        const safeText = escapeHtml(msg.text || '');
        const time = msg.time || formatTime(msg.timestamp || Date.now());
        const msgUsername = escapeHtml(msg.username || '匿名');
        html += `
            <div class="message ${msgClass}">
                <div class="message-header">
                    <span class="message-username">${msgUsername}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-bubble">${safeText}</div>
            </div>
        `;
    });
    messagesListEl.innerHTML = html;
}

// ========== 发送消息 ==========
async function sendMessage(text) {
    if (!text.trim() || !currentRoomKey || isSending) return;
    isSending = true;
    sendBtn.disabled = true;
    const newMsg = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 8),
        userId: userId,
        username: username,
        text: text.trim(),
        timestamp: Date.now(),
        time: formatTime(new Date())
    };
    // 乐观更新
    messages.push(newMsg);
    renderMessages();
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // 保存到服务器
    try {
        const allMsgs = await loadMessages(currentRoomKey);
        allMsgs.push(newMsg);
        const success = await saveMessages(currentRoomKey, allMsgs);
        if (!success) throw new Error('保存失败');
        messageInput.value = '';
    } catch (e) {
        // 回滚
        messages.pop();
        renderMessages();
        showError('发送失败，请重试');
    } finally {
        isSending = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// ========== 创建新房间 ==========
async function createRoom() {
    const roomName = prompt('请输入新房间名称', '新聊天室');
    if (!roomName || !roomName.trim()) return;
    const trimmed = roomName.trim().slice(0, 30);
    try {
        const newKey = await generateUniqueRoomKey();
        // 初始化空消息
        await saveMessages(newKey, []);
        // 更新房间列表
        rooms.push({ name: trimmed, key: newKey });
        await saveRoomList(rooms);
        renderRooms();
        // 自动切换到新房间
        await switchRoom(newKey, trimmed);
    } catch (e) {
        showError('创建失败: ' + e.message);
    }
}

// ========== 修改用户名 ==========
function changeUsername() {
    const newName = prompt('请输入新昵称 (1-16位)', username);
    if (newName && newName.trim()) {
        username = newName.trim().slice(0, 16);
        localStorage.setItem('chat_username', username);
        usernameDisplay.textContent = username;
        showError('昵称已更新', 1500);
    }
}

// ========== 初始化应用 ==========
async function initApp() {
    updateStatus(true);
    // 加载房间列表
    rooms = await loadRoomList();
    await ensureDefaultRoom();      // 确保至少有一个房间

    // 重新加载以防ensureDefault添加了新房间
    rooms = await loadRoomList();
    renderRooms();

    if (rooms.length > 0) {
        // 默认选中第一个房间
        await switchRoom(rooms[0].key, rooms[0].name);
    } else {
        currentRoomNameEl.textContent = '无房间';
        messageInput.disabled = true;
        sendBtn.disabled = true;
    }

    // 监听发送
    sendBtn.addEventListener('click', () => sendMessage(messageInput.value));
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(messageInput.value);
        }
    });
    // 新建房间
    createRoomBtn.addEventListener('click', createRoom);
    // 双击修改用户名
    userProfile.addEventListener('dblclick', changeUsername);
    // 点击头像也可修改
    userProfile.addEventListener('click', changeUsername);
}

// 启动
initApp().catch(e => {
    showError('启动失败: ' + e.message);
    updateStatus(false);
});