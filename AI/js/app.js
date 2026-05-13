// ============================================================
//  app.js — UI 交互 & 上下文管理
//  直接使用全局 Chat 对象
// ============================================================
const Chat = window.Chat;

// ---------- 全局状态 ----------
const STORAGE_KEY = 'chat_data';
const THEME_KEY = 'app_theme';
let currentChatId = null;
let chatCache = {};
let indexList = [];
let isGenerating = false;

// DOM 元素
const loaderScreen = document.getElementById('loaderScreen');
const appContainer = document.getElementById('appContainer');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const menuBtn = document.getElementById('menuBtn');
const collapseBtn = document.getElementById('sidebarCollapseBtn');
const sidebarList = document.getElementById('sidebarList');
const chatTitleDisplay = document.getElementById('chatTitleDisplay');
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const uploadBtn = document.getElementById('uploadBtn');
const themeBtn = document.getElementById('themeBtn');
const progressFill = document.getElementById('progressFill');
const loaderLogs = document.getElementById('loaderLogs');

// ---------- 夜间模式切换 ----------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // 更新图标：亮色模式显示月亮（dark_mode），暗色模式显示太阳（light_mode）
  const icon = themeBtn.querySelector('.material-symbols-outlined');
  if (icon) {
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
  }
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  playSound('click');
}

// 初始化主题：从 localStorage 读取，若无则跟随系统偏好
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

// ---------- Markdown 安全解析 ----------
function markdownToHtml(text) {
    if (typeof marked !== 'undefined' && marked.parse) {
        return marked.parse(text);
    } else {
        return `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(text)}</pre>`;
    }
}

// ---------- Debug 日志 ----------
function debugLog(msg, data = null) {
    if (data) {
        console.debug(`[DEBUG] ${msg}`, data);
    } else {
        console.debug(`[DEBUG] ${msg}`);
    }
}

// ---------- 工具函数 ----------
function now() {
    const d = new Date();
    return `${d.getFullYear().toString().slice(-2)}:${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}:${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
}

function stripMarkdown(text) {
    return text
        .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
        .replace(/#{1,6}\s/g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
        .replace(/`{1,3}[^`]*`{1,3}/g, '').replace(/~~(.*?)~~/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/!\[.*\]\([^)]+\)/g, '')
        .replace(/>\s/g, '').replace(/[-*+]\s/g, '');
}

// ---------- 音效系统 ----------
let audioCtx = null;
function initAudio() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { debugLog('无法初始化音频', e); }
}
function playSound(type = 'click') {
    if (!audioCtx) return;
    try {
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        switch (type) {
            case 'click': osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(400, t + 0.08); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08); osc.start(t); osc.stop(t + 0.08); break;
            case 'send': osc.frequency.setValueAtTime(600, t); osc.frequency.exponentialRampToValueAtTime(1200, t + 0.12); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12); osc.start(t); osc.stop(t + 0.12); break;
            case 'receive': osc.frequency.setValueAtTime(1000, t); osc.frequency.exponentialRampToValueAtTime(500, t + 0.15); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15); osc.start(t); osc.stop(t + 0.15); break;
            case 'error': osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(150, t + 0.2); gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2); osc.start(t); osc.stop(t + 0.2); break;
        }
    } catch (e) { /* 静默 */ }
}

// ---------- Snackbar 提示 ----------
function showToast(message, duration = 2500) {
    const toast = document.createElement('div');
    toast.className = 'snackbar';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ---------- 进度弹窗 ----------
function showUploadModal() {
    let modal = document.getElementById('uploadModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'uploadModal';
        modal.className = 'upload-modal';
        modal.innerHTML = `
          <div class="upload-modal-content">
            <h3>正在同步云端</h3>
            <div class="progress-bar" style="margin: 16px 0;">
              <div class="progress-fill" id="uploadProgressFill" style="width: 0%"></div>
            </div>
            <div class="upload-logs" id="uploadLogs" style="max-height: 80px; overflow-y: auto; font-size: 13px; color: var(--md-sys-color-on-surface-variant); text-align: left;"></div>
          </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('uploadProgressFill').style.width = '0%';
    document.getElementById('uploadLogs').innerHTML = '';
    modal.classList.add('show');
}
function hideUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.classList.remove('show');
}
function updateUploadProgress(percent, message = '') {
    const fill = document.getElementById('uploadProgressFill');
    if (fill) fill.style.width = `${Math.min(100, percent)}%`;
    if (message) {
        const logs = document.getElementById('uploadLogs');
        if (logs) {
            const line = document.createElement('div');
            line.textContent = `[${new Date().toTimeString().slice(0,8)}] ${message}`;
            logs.appendChild(line);
            logs.scrollTop = logs.scrollHeight;
        }
    }
}

// ---------- localStorage 操作 ----------
function loadFromStorage() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveToStorage(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function saveCurrentChat() {
    if (!currentChatId || !chatCache[currentChatId]) return;
    const all = loadFromStorage();
    all[currentChatId] = chatCache[currentChatId];
    saveToStorage(all);
}

// ---------- 对话渲染 ----------
function renderMessages(chatId) {
    const text = chatCache[chatId] || '';
    const lines = text.split('\n');
    messagesArea.innerHTML = '';
    if (lines.length <= 1) {
        messagesArea.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">forum</span><h2>开始对话</h2><p>输入消息开始</p></div>`;
        return;
    }
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^\[(.+?)\]\[.+?\]：(.+)$/);
        if (!match) continue;
        const [, role, content] = match;
        const isUser = role === '用户';
        const row = document.createElement('div');
        row.className = `message-row ${isUser ? 'user' : 'assistant'}`;
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${isUser ? 'user' : 'assistant'}`;
        bubble.innerHTML = markdownToHtml(content);
        row.appendChild(bubble);
        messagesArea.appendChild(row);
    }
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ---------- 侧边栏 ----------
function renderSidebar() {
    sidebarList.innerHTML = '';
    if (indexList.length === 0) {
        sidebarList.innerHTML = '<div class="sidebar-empty">暂无对话</div>';
        return;
    }
    indexList.forEach(({ id, title }) => {
        const div = document.createElement('div');
        div.className = `chat-item${id === currentChatId ? ' active' : ''}`;
        div.dataset.id = id;
        div.innerHTML = `<span class="material-symbols-outlined">chat_bubble</span><span class="chat-title">${escapeHtml(title)}</span>`;
        div.addEventListener('click', () => switchChat(id));
        sidebarList.appendChild(div);
    });
}

async function switchChat(id) {
    if (id === currentChatId) return;
    if (currentChatId && chatCache[currentChatId]) {
        saveCurrentChat();
    }
    if (!chatCache[id]) {
        try {
            const { content } = await Chat.getGiteeFile(`${id}.txt`);
            chatCache[id] = content;
        } catch (e) {
            showToast('无法加载该对话');
            playSound('error');
            return;
        }
    }
    currentChatId = id;
    chatTitleDisplay.textContent = indexList.find(i => i.id === id)?.title || '对话';
    renderMessages(id);
    renderSidebar();
    if (window.innerWidth < 768) closeSidebar();
    playSound('click');
}

// ---------- 新建对话 ----------
async function createNewChat() {
    const title = prompt('请输入对话标题：');
    if (!title) return;
    const maxId = indexList.reduce((max, item) => Math.max(max, parseInt(item.id)), 0);
    const newId = (maxId + 1).toString().padStart(5, '0');
    chatCache[newId] = `标题：${title}\n`;
    currentChatId = newId;
    indexList.unshift({ id: newId, title, order: Date.now() });
    saveCurrentChat();
    renderSidebar();
    renderMessages(newId);
    chatTitleDisplay.textContent = title;
    playSound('click');
}

// ---------- 发送消息 ----------
async function handleSend() {
    if (!currentChatId) {
        showToast('请先选择或新建一个对话');
        playSound('error');
        return;
    }
    const input = messageInput.value.trim();
    if (!input || isGenerating) return;

    const userLine = `[用户][${now()}]：${input}\n`;
    chatCache[currentChatId] += userLine;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    renderMessages(currentChatId);
    saveCurrentChat();
    playSound('send');

    const systemPrompt = Chat.getConfig ? Chat.getConfig().ai.systemPrompt : '';
    const lines = chatCache[currentChatId].split('\n').filter(l => l.startsWith('['));
    const messages = [];
    for (const line of lines) {
        const m = line.match(/^\[(.+?)\]\[.+?\]：(.+)$/);
        if (!m) continue;
        const role = m[1] === '用户' ? 'user' : 'assistant';
        let content = m[2];
        if (role === 'user') {
            content = `系统提示词（必须）：${systemPrompt}\n用户消息（重要）：${content}`;
        }
        messages.push({ role, content });
    }

    isGenerating = true;
    sendBtn.disabled = true;

    const row = document.createElement('div');
    row.className = 'message-row assistant';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble assistant';
    row.appendChild(bubble);
    messagesArea.querySelector('.empty-state')?.remove();
    messagesArea.appendChild(row);

    let fullResponse = '';
    let inThink = false;
    let thinkBuffer = '';

    await Chat.streamChat(messages, (chunk) => {
        let text = chunk;
        while (text.includes('<')) {
            if (!inThink && text.includes('<thinking>')) {
                const idx = text.indexOf('<thinking>');
                fullResponse += text.slice(0, idx);
                text = text.slice(idx + 10);
                inThink = true;
                thinkBuffer = '';
            } else if (inThink && text.includes('</thinking>')) {
                const idx = text.indexOf('</thinking>');
                thinkBuffer += text.slice(0, idx);
                text = text.slice(idx + 11);
                inThink = false;
            } else {
                if (inThink) {
                    thinkBuffer += text;
                    text = '';
                }
                break;
            }
        }
        if (!inThink) {
            fullResponse += text;
            bubble.innerHTML = markdownToHtml(fullResponse);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    });

    const cleanResponse = stripMarkdown(fullResponse);
    chatCache[currentChatId] += `[助手][${now()}]：${cleanResponse}\n`;
    saveCurrentChat();

    isGenerating = false;
    sendBtn.disabled = false;
    playSound('receive');
}

// ---------- 上传流程 ----------
async function uploadWithProgress() {
    const allChats = loadFromStorage();
    const ids = Object.keys(allChats);
    if (ids.length === 0) {
        showToast('没有需要上传的对话');
        return;
    }

    showUploadModal();
    updateUploadProgress(0, `开始上传 ${ids.length} 个对话...`);

    let latestIndex;
    try {
        latestIndex = await Chat.fetchIndex();
        updateUploadProgress(10, '已获取云端索引');
    } catch {
        latestIndex = [];
        updateUploadProgress(10, '云端索引不存在，将新建');
    }

    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const content = allChats[id];
        const title = (content.split('\n')[0] || '').replace('标题：', '').trim();
        try {
            const existing = latestIndex.find(it => it.id === id);
            if (existing) {
                const { sha } = await Chat.getGiteeFile(`${id}.txt`);
                await Chat.updateGiteeFile(`${id}.txt`, content, sha);
                updateUploadProgress(10 + (i+1)/ids.length*80, `已更新: ${id} (${title})`);
            } else {
                await Chat.createGiteeFile(`${id}.txt`, content);
                updateUploadProgress(10 + (i+1)/ids.length*80, `已新建: ${id} (${title})`);
            }
            delete allChats[id];
            saveToStorage(allChats);
        } catch (e) {
            updateUploadProgress(10 + (i+1)/ids.length*80, `上传失败: ${id} (${e.message})`);
        }
    }

    const newIndexMap = {};
    latestIndex.forEach(i => newIndexMap[i.id] = i);
    ids.forEach(id => {
        const title = (chatCache[id]?.split('\n')[0] || '').replace('标题：', '').trim();
        if (title) newIndexMap[id] = { id, title, order: Date.now() };
    });
    indexList = Object.values(newIndexMap).sort((a, b) => b.order - a.order);
    try {
        await Chat.uploadIndex(indexList);
        renderSidebar();
        updateUploadProgress(100, '云端同步完成');
        playSound('send');
    } catch (e) {
        updateUploadProgress(100, '索引更新失败: ' + e.message);
    }
    setTimeout(() => hideUploadModal(), 1200);
}

// ---------- 启动进度条与日志 ----------
let logLines = [];
function addLog(text) {
    const time = new Date().toTimeString().slice(0,8);
    logLines.push(`[${time}] ${text}`);
    if (logLines.length > 3) logLines = logLines.slice(-3);
    loaderLogs.innerHTML = logLines.map(l => `<div class="log-line">${escapeHtml(l)}</div>`).join('');
}
function setProgress(percent) {
    progressFill.style.width = `${Math.min(100, percent)}%`;
}

async function boot() {
    addLog('正在加载资源...');
    setProgress(5);

    // 等待 marked 库就绪
    if (typeof marked === 'undefined') {
        addLog('等待 Markdown 解析库...');
        await new Promise((resolve) => {
            let attempts = 0;
            const check = setInterval(() => {
                if (typeof marked !== 'undefined' || attempts++ > 50) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }

    addLog('正在加载配置...');
    setProgress(10);
    try {
        await Chat.loadConfig();
    } catch (e) {
        addLog('配置加载失败，请检查 config.json');
        console.error(e);
        return;
    }

    const files = ['css/ui.css', 'css/data.css', 'js/chat.js'];
    for (let i = 0; i < files.length; i++) {
        await new Promise(r => setTimeout(r, 300));
        addLog(`已加载 ${files[i]}`);
        setProgress(20 + (i+1)*15);
    }

    addLog('正在同步云端数据...');
    try {
        indexList = await Chat.fetchIndex();
        addLog(`找到 ${indexList.length} 个云端对话`);
    } catch (e) {
        indexList = [];
        addLog('无法连接云端，使用本地缓存');
    }

    const localData = loadFromStorage();
    for (const id of Object.keys(localData)) {
        if (!indexList.find(i => i.id === id)) {
            const title = (localData[id].split('\n')[0] || '').replace('标题：', '').trim();
            indexList.push({ id, title, order: Date.now() });
        }
        chatCache[id] = localData[id];
    }
    indexList.sort((a, b) => b.order - a.order);

    if (Object.keys(localData).length > 0) {
        addLog('正在上传本地草稿...');
        await uploadWithProgress();
    }

    renderSidebar();

    if (indexList.length > 0) {
        const latestId = indexList[0].id;
        if (!chatCache[latestId]) {
            try {
                const { content } = await Chat.getGiteeFile(`${latestId}.txt`);
                chatCache[latestId] = content;
            } catch (e) {
                const title = indexList[0].title || '对话';
                chatCache[latestId] = `标题：${title}\n`;
            }
        }
        await switchChat(latestId);
    } else {
        chatTitleDisplay.textContent = 'AI Chat';
        messagesArea.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">forum</span><h2>开始对话</h2><p>点击侧边栏“新建对话”开始</p></div>`;
    }

    loaderScreen.style.display = 'none';
    appContainer.style.display = 'flex';
    debugLog('启动完成');
}

// ---------- 侧边栏交互 ----------
function openSidebar() {
    if (window.innerWidth < 768) {
        sidebar.classList.add('open'); overlay.classList.add('show');
    } else {
        sidebar.classList.remove('collapsed'); menuBtn.style.display = 'none';
    }
}
function closeSidebar() {
    if (window.innerWidth < 768) {
        sidebar.classList.remove('open'); overlay.classList.remove('show');
    } else {
        sidebar.classList.add('collapsed'); menuBtn.style.display = 'flex';
    }
}
collapseBtn.addEventListener('click', () => { closeSidebar(); playSound('click'); });
menuBtn.addEventListener('click', () => { openSidebar(); playSound('click'); });
overlay.addEventListener('click', closeSidebar);
window.addEventListener('resize', () => {
    if (window.innerWidth < 768) menuBtn.style.display = 'flex';
    else menuBtn.style.display = sidebar.classList.contains('collapsed') ? 'flex' : 'none';
});

// ---------- 事件绑定 ----------
newChatBtn.addEventListener('click', createNewChat);
sendBtn.addEventListener('click', handleSend);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + 'px';
});
uploadBtn.addEventListener('click', () => {
    initAudio();
    if (confirm('确定要将本地所有对话上传到云端并清空本地缓存吗？')) {
        uploadWithProgress();
    }
});
themeBtn.addEventListener('click', toggleTheme);

// ---------- 动态色相（提速 + 随机初始值） ----------
(function startHueAnimation() {
    const root = document.documentElement;
    let hue = Math.floor(Math.random() * 360);  // 随机初始色相
    const speed = 1.2;  // 加快渐变速度
    let last = performance.now();
    function step(now) {
        const delta = Math.min(0.1, (now - last) / 1000);
        last = now;
        hue = (hue + speed * delta) % 360;
        root.style.setProperty('--md-sys-hue', Math.round(hue));
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
})();

// 初始化主题（需在 boot 前调用）
initTheme();

// 激活音频上下文
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

// 安全启动
boot().catch(err => {
    addLog(`启动失败: ${err.message}`);
    console.error(err);
});