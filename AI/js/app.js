const Chat = window.Chat;

let currentUser = 'guest';
let currentChatId = null;
let chatCache = {};
let indexList = [];
let isGenerating = false;

const THEME_KEY = 'app_theme';

// 捐赠弹窗相关
const DONATION_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30天

// DOM 元素
const loaderScreen = document.getElementById('loaderScreen');
const appContainer = document.getElementById('appContainer');
const loginOverlay = document.getElementById('loginOverlay');
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
const loginNavBtn = document.getElementById('loginNavBtn');
const progressFill = document.getElementById('progressFill');
const loaderLogs = document.getElementById('loaderLogs');
const userInfo = document.getElementById('userInfo');
const userNameDisplay = document.getElementById('userNameDisplay');
const loginUserInput = document.getElementById('loginUser');
const loginPassInput = document.getElementById('loginPass');
const loginSubmitBtn = document.getElementById('loginBtn');
const guestBtnElem = document.getElementById('guestBtn');
const closeLoginBtn = document.getElementById('closeLoginBtn');
const loginErrorEl = document.getElementById('loginError');

// ================== 工具函数 ==================
function now() {
  const d = new Date();
  return `${String(d.getFullYear()).slice(-2)}:${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}:${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}
function escapeHtml(text) { return String(text).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }
function encodeNewlines(str) { return str.replace(/\n/g, '\\n'); }
function decodeNewlines(str) { return str.replace(/\\n/g, '\n'); }
function stripThinking(text) { return text.replace(/<thinking>[\s\S]*?<\/thinking>/g, ''); }

// ================== 安全 Markdown 解析 ==================
function parseMarkdown(text) {
  if (typeof marked !== 'undefined' && marked.parse) {
    return marked.parse(text);
  }
  return `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${escapeHtml(text)}</pre>`;
}

// ================== 音效 ==================
let audioCtx = null;
function initAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
}
async function playSound(type='click') {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch (e) {}
  }
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  switch(type) {
    case 'click': osc.frequency.setValueAtTime(800,t); osc.frequency.exponentialRampToValueAtTime(400,t+0.08); gain.gain.setValueAtTime(0.1,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.08); osc.start(t); osc.stop(t+0.08); break;
    case 'send': osc.frequency.setValueAtTime(600,t); osc.frequency.exponentialRampToValueAtTime(1200,t+0.12); gain.gain.setValueAtTime(0.1,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.12); osc.start(t); osc.stop(t+0.12); break;
    case 'receive': osc.frequency.setValueAtTime(1000,t); osc.frequency.exponentialRampToValueAtTime(500,t+0.15); gain.gain.setValueAtTime(0.1,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.15); osc.start(t); osc.stop(t+0.15); break;
    case 'error': osc.frequency.setValueAtTime(200,t); osc.frequency.exponentialRampToValueAtTime(150,t+0.2); gain.gain.setValueAtTime(0.15,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.2); osc.start(t); osc.stop(t+0.2); break;
  }
}

// ================== 轻提示 ==================
function showToast(msg, dur=2500) {
  const el = document.createElement('div'); el.className='snackbar'; el.textContent=msg; document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); el.addEventListener('transitionend',()=>el.remove()); setTimeout(()=>el.remove(),300); }, dur);
}

// ================== 上传弹窗 ==================
function showUploadModal() {
  let m = document.getElementById('uploadModal');
  if (!m) {
    m = document.createElement('div'); m.id='uploadModal'; m.className='upload-modal';
    m.innerHTML=`<div class="upload-modal-content"><h3>正在同步云端</h3><div class="progress-bar" style="margin:16px 0"><div class="progress-fill" id="uploadProgressFill" style="width:0%"></div></div><div class="upload-logs" id="uploadLogs" style="max-height:80px;overflow-y:auto;font-size:13px;color:var(--md-sys-color-on-surface-variant);text-align:left;"></div></div>`;
    document.body.appendChild(m);
  }
  document.getElementById('uploadProgressFill').style.width='0%'; document.getElementById('uploadLogs').innerHTML=''; m.classList.add('show');
}
function hideUploadModal(){ const m=document.getElementById('uploadModal'); if(m)m.classList.remove('show'); }
function updateUploadProgress(pct,msg=''){
  const fill=document.getElementById('uploadProgressFill'); if(fill)fill.style.width=Math.min(100,pct)+'%';
  if(msg){ const logs=document.getElementById('uploadLogs'); if(logs){ const l=document.createElement('div'); l.textContent=`[${new Date().toTimeString().slice(0,8)}] ${msg}`; logs.appendChild(l); logs.scrollTop=logs.scrollHeight; } }
}

async function uploadWithProgress() {
  if (!currentUser || currentUser === 'guest') { showToast('访客无法上传'); return; }
  if (!currentChatId || !chatCache[currentChatId]) { showToast('无当前对话'); return; }
  const id = currentChatId;
  const content = chatCache[id];
  showUploadModal();
  updateUploadProgress(0, '正在上传当前对话...');
  try {
    const existing = indexList.find(i => i.id === id);
    if (existing) {
      const { sha } = await Chat.getFile(currentUser, `${id}.txt`);
      await Chat.updateFile(currentUser, `${id}.txt`, content, sha, '更新对话');
    } else {
      await Chat.createFile(currentUser, `${id}.txt`, content, '新建对话');
      const title = content.split('\n')[0].replace('标题：', '').trim();
      indexList.unshift({ id, title, order: Date.now() });
      await Chat.uploadIndex(currentUser, indexList);
      renderSidebar();
    }
    updateUploadProgress(100, '上传完成');
    playSound('send');
  } catch(e) {
    updateUploadProgress(100, `上传失败: ${e.message}`);
  }
  setTimeout(hideUploadModal, 1500);
}

// ================== Cookie 操作 ==================
function setCookie(name, value, days = 365) {
  const d = new Date(); d.setTime(d.getTime() + days * 86400000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}
function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// ================== 登录管理 ==================
const Login = {
  COOKIE_NAME: 'chat_user',
  async getPasswd() {
    const { content } = await Chat.getFile('', 'passwd.json');
    return JSON.parse(content);
  },
  async validateUser(username) {
    if (username === 'guest') return true;
    try { const passwd = await this.getPasswd(); return passwd.hasOwnProperty(username); } catch { return false; }
  },
  async getCurrentUser() {
    const user = getCookie(this.COOKIE_NAME);
    if (!user) return null;
    const valid = await this.validateUser(user);
    return valid ? user : null;
  },
  async login(username, password) {
    if (username === 'guest') {
      setCookie(this.COOKIE_NAME, 'guest');
      return true;
    }
    try {
      const passwd = await this.getPasswd();
      if (!passwd.hasOwnProperty(username)) return false;
      if (passwd[username] === password) {
        setCookie(this.COOKIE_NAME, username);
        return true;
      }
    } catch(e) { console.error(e); }
    return false;
  },
  logout() {
    deleteCookie(this.COOKIE_NAME);
    location.reload();
  }
};

// ================== 自定义对话框（替代原生 confirm / prompt） ==================
function showAppDialog({ title, message = '', placeholder = '', defaultValue = '', showInput = false }) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('appDialogOverlay');
        const titleEl = document.getElementById('appDialogTitle');
        const messageEl = document.getElementById('appDialogMessage');
        const inputEl = document.getElementById('appDialogInput');
        const okBtn = document.getElementById('appDialogOkBtn');
        const cancelBtn = document.getElementById('appDialogCancelBtn');

        titleEl.textContent = title;
        messageEl.textContent = message;
        messageEl.style.display = message ? 'block' : 'none';

        inputEl.style.display = showInput ? 'block' : 'none';
        inputEl.placeholder = placeholder;
        inputEl.value = defaultValue;

        overlay.style.display = 'flex';
        if (showInput) inputEl.focus();

        function cleanup() {
            overlay.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
        }

        function onOk() {
            cleanup();
            resolve(showInput ? inputEl.value.trim() : true);
        }

        function onCancel() {
            cleanup();
            resolve(showInput ? null : false);
        }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') onOk();
        });
    });
}

function customConfirm(message) {
    return showAppDialog({ title: '确认', message });
}

function customPrompt(title, placeholder = '', defaultValue = '') {
    return showAppDialog({ title, placeholder, defaultValue, showInput: true });
}

// ================== 捐赠弹窗 ==================
function getDonationLastShown(user) {
  return localStorage.getItem(`donation_last_shown_${user}`);
}

function setDonationLastShown(user) {
  localStorage.setItem(`donation_last_shown_${user}`, Date.now().toString());
}

function shouldShowDonation(user) {
  if (user === 'guest') return false;
  // 强制弹出（刚登录）
  if (localStorage.getItem('force_donation') === '1') {
    localStorage.removeItem('force_donation');
    return true;
  }
  // 每月一次
  const lastShown = getDonationLastShown(user);
  if (!lastShown) return true;
  const elapsed = Date.now() - parseInt(lastShown);
  return elapsed > DONATION_INTERVAL;
}

function showDonationModal() {
  if (document.getElementById('donationOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'donationOverlay';
  overlay.className = 'login-overlay';
  overlay.style.zIndex = '2000';

  const box = document.createElement('div');
  box.className = 'login-box';
  box.innerHTML = `
    <h2 style="margin-bottom:16px;">感谢使用 AI Chat</h2>
    <p style="margin-bottom:16px; font-size:14px; color:var(--md-sys-color-on-surface-variant);">如果您觉得这个应用有帮助，可以考虑支持我们。</p>
    <button id="donateToMeBtn" style="margin-bottom:8px;">❤️ 向我捐赠</button>
    <button id="donateToCharityBtn" style="margin-bottom:8px;">🌍 向公益平台捐赠</button>
    <button id="skipDonationBtn" class="guest-btn">跳过</button>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document.getElementById('donateToMeBtn').addEventListener('click', () => {
    window.open('https://afdian.net/your-page', '_blank'); // 替换为你的爱发电链接
    closeDonationModal();
  });

  document.getElementById('donateToCharityBtn').addEventListener('click', () => {
    window.open('https://love.alipay.com/donate/index.htm', '_blank'); // 支付宝公益
    closeDonationModal();
  });

  document.getElementById('skipDonationBtn').addEventListener('click', () => {
    closeDonationModal();
  });
}

function closeDonationModal() {
  const overlay = document.getElementById('donationOverlay');
  if (overlay) {
    overlay.remove();
    setDonationLastShown(currentUser);
  }
}

// ================== 渲染 ==================
function renderMessages(chatId) {
  const text = chatCache[chatId] || '';
  const lines = text.split('\n');
  messagesArea.innerHTML = '';
  if (lines.length <= 1) {
    messagesArea.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">forum</span><h2>开始对话</h2><p>输入消息开始</p></div>';
    return;
  }
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\[(用户|助手)\]\[(\d{2}:\d{4}:\d{2}:\d{2}:\d{2})\]：(.*)$/);
    if (!match) continue;
    const [, role, , content] = match;
    const isUser = role === '用户';
    const row = document.createElement('div'); row.className = `message-row ${isUser ? 'user' : 'assistant'}`;
    const bubble = document.createElement('div'); bubble.className = `message-bubble ${isUser ? 'user' : 'assistant'}`;
    bubble.innerHTML = parseMarkdown(decodeNewlines(content));
    row.appendChild(bubble);
    messagesArea.appendChild(row);
  }
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function renderSidebar() {
  sidebarList.innerHTML = '';
  const validItems = indexList.filter(item => item && item.id && item.title);
  if (!validItems.length) { sidebarList.innerHTML='<div class="sidebar-empty">暂无对话</div>'; return; }
  validItems.forEach(({id,title}) => {
    const div = document.createElement('div'); div.className=`chat-item${id===currentChatId?' active':''}`; div.dataset.id=id;
    div.innerHTML=`<span class="material-symbols-outlined">chat_bubble</span><span class="chat-title">${escapeHtml(title)}</span>`;
    div.addEventListener('click', ()=>switchChat(id)); sidebarList.appendChild(div);
  });
}

async function switchChat(id) {
  if (!id || id === currentChatId) return;
  if (currentUser !== 'guest') {
    try { await saveCurrentChatSilent(); } catch (e) {}
  }
  if (!chatCache[id]) {
    try { const { content } = await Chat.getFile(currentUser, `${id}.txt`); chatCache[id] = content; }
    catch { showToast('无法加载该对话'); playSound('error'); return; }
  }
  currentChatId = id;
  chatTitleDisplay.textContent = indexList.find(i=>i.id===id)?.title || '对话';
  renderMessages(id);
  renderSidebar();
  if (window.innerWidth < 768) closeSidebar();
  playSound('click');
}

async function createNewChat() {
  if (currentUser === 'guest') { showToast('访客模式无法新建对话，请登录'); return; }
  const title = await customPrompt('新建对话', '请输入对话标题');
  if (!title) return;
  const cloudIndex = await Chat.fetchIndex(currentUser);
  const maxId = Math.max(
    indexList.reduce((max,item)=>Math.max(max,parseInt(item.id)||0),0),
    cloudIndex.reduce((max,item)=>Math.max(max,parseInt(item.id)||0),0)
  );
  const newId = String(maxId + 1).padStart(5, '0');
  const content = `标题：${title}\n`;
  chatCache[newId] = content;
  currentChatId = newId;
  indexList.unshift({ id:newId, title, order: Date.now() });
  renderSidebar();
  renderMessages(newId);
  chatTitleDisplay.textContent = title;
  try {
    await Chat.createFile(currentUser, `${newId}.txt`, content, `创建对话 ${title}`);
    await Chat.uploadIndex(currentUser, indexList);
  } catch(e) { showToast('云端同步失败：' + e.message); }
  playSound('click');
}

// ================== 构建消息 ==================
function buildMessages(chatId) {
  const systemPrompt = Chat.getConfig().ai.systemPrompt;
  const lines = chatCache[chatId].split('\n').filter(l => l.startsWith('['));
  return lines.map(line => {
    const m = line.match(/^\[(用户|助手)\]\[(\d{2}:\d{4}:\d{2}:\d{2}:\d{2})\]：(.*)$/);
    if (!m) return null;
    const role = m[1] === '用户' ? 'user' : 'assistant';
    let content = decodeNewlines(m[3]);
    if (role === 'user') {
      content = `上下文:\n系统提示词(重要): ${systemPrompt}\n正文消息(重要): ${content}`;
    }
    return { role, content };
  }).filter(Boolean);
}

// ================== 发送消息（流式切换安全） ==================
async function handleSend() {
  initAudio();
  if (!currentChatId) { showToast('请先选择或新建一个对话'); playSound('error'); return; }
  const input = messageInput.value.trim();
  if (!input || isGenerating) return;

  const cid = currentChatId;
  const userLine = `[用户][${now()}]：${encodeNewlines(input)}\n`;
  chatCache[cid] += userLine;
  messageInput.value = ''; messageInput.style.height = 'auto';
  if (currentChatId === cid) renderMessages(cid);
  playSound('send');

  if (currentUser !== 'guest') {
    try {
      const existing = indexList.find(i => i.id === cid);
      const content = chatCache[cid];
      if (existing) {
        const { sha } = await Chat.getFile(currentUser, `${cid}.txt`);
        await Chat.updateFile(currentUser, `${cid}.txt`, content, sha, '更新对话');
      } else {
        await Chat.createFile(currentUser, `${cid}.txt`, content, '新建对话');
        const title = content.split('\n')[0].replace('标题：', '').trim();
        indexList.unshift({ id: cid, title, order: Date.now() });
        await Chat.uploadIndex(currentUser, indexList);
        renderSidebar();
      }
    } catch(e) { showToast('云端保存失败：' + e.message); }
  }

  const messages = buildMessages(cid);
  isGenerating = true; sendBtn.disabled = true;

  let assistantRow, thinkBlock, bodyBubble;
  if (currentChatId === cid) {
    assistantRow = document.createElement('div'); assistantRow.className = 'message-row assistant';
    thinkBlock = document.createElement('div'); thinkBlock.className = 'think-block';
    thinkBlock.innerHTML = '<div class="think-summary"><span class="material-symbols-outlined">chevron_right</span>思考过程</div><div class="think-content"></div>';
    thinkBlock.querySelector('.think-summary').addEventListener('click', ()=>thinkBlock.classList.toggle('open'));
    thinkBlock.style.display = 'none';
    assistantRow.appendChild(thinkBlock);
    bodyBubble = document.createElement('div'); bodyBubble.className = 'message-bubble assistant';
    assistantRow.appendChild(bodyBubble);
    messagesArea.querySelector('.empty-state')?.remove();
    messagesArea.appendChild(assistantRow);
  }

  let rawChunk = '', thinkContent = '', bodyContent = '', inThink = false;

  try {
    await Chat.streamChat(messages, (chunk) => {
      rawChunk += chunk;
      while (rawChunk.length) {
        if (!inThink) {
          const idx = rawChunk.indexOf('<thinking>');
          if (idx === -1) { bodyContent += rawChunk; rawChunk = ''; }
          else { bodyContent += rawChunk.slice(0, idx); rawChunk = rawChunk.slice(idx + 10); inThink = true; }
        } else {
          const idx = rawChunk.indexOf('</thinking>');
          if (idx === -1) { thinkContent += rawChunk; rawChunk = ''; }
          else {
            thinkContent += rawChunk.slice(0, idx); rawChunk = rawChunk.slice(idx + 11); inThink = false;
            if (thinkBlock && currentChatId === cid) {
              thinkBlock.style.display = 'block';
              thinkBlock.querySelector('.think-content').textContent = thinkContent;
              thinkBlock.classList.add('open');
            }
          }
        }
      }
      if (currentChatId === cid && bodyBubble) {
        bodyBubble.innerHTML = parseMarkdown(bodyContent);
        messagesArea.scrollTop = messagesArea.scrollHeight;
      }
    });
  } catch(e) { console.error(e); } finally {
    if (inThink) thinkContent = '';
    const finalBody = stripThinking(bodyContent.trim());
    chatCache[cid] += `[助手][${now()}]：${encodeNewlines(finalBody)}\n`;
    if (currentChatId === cid) renderMessages(cid);
    isGenerating = false; sendBtn.disabled = false;
    playSound('receive');

    if (currentUser !== 'guest') {
      try {
        const existing = indexList.find(i => i.id === cid);
        const content = chatCache[cid];
        if (existing) {
          const { sha } = await Chat.getFile(currentUser, `${cid}.txt`);
          await Chat.updateFile(currentUser, `${cid}.txt`, content, sha, '更新对话');
        } else {
          await Chat.createFile(currentUser, `${cid}.txt`, content, '新建对话');
          const title = content.split('\n')[0].replace('标题：', '').trim();
          indexList.unshift({ id: cid, title, order: Date.now() });
          await Chat.uploadIndex(currentUser, indexList);
          renderSidebar();
        }
      } catch(e) { showToast('云端保存失败：' + e.message); }
    }
  }
}

async function saveCurrentChatSilent() {
  if (!currentChatId || !chatCache[currentChatId] || currentUser === 'guest') return;
  const id = currentChatId;
  const content = chatCache[id];
  try {
    const existing = indexList.find(i => i.id === id);
    if (existing) {
      const { sha } = await Chat.getFile(currentUser, `${id}.txt`);
      await Chat.updateFile(currentUser, `${id}.txt`, content, sha, '更新对话');
    } else {
      await Chat.createFile(currentUser, `${id}.txt`, content, '新建对话');
      const title = content.split('\n')[0].replace('标题：', '').trim();
      indexList.unshift({ id, title, order: Date.now() });
      await Chat.uploadIndex(currentUser, indexList);
      renderSidebar();
    }
  } catch(e) {}
}

// ================== 启动流程 ==================
let logLines=[];
function addLog(txt){ const t=new Date().toTimeString().slice(0,8); logLines.push(`[${t}] ${txt}`); if(logLines.length>3)logLines=logLines.slice(-3); loaderLogs.innerHTML=logLines.map(l=>`<div class="log-line">${escapeHtml(l)}</div>`).join(''); }
function setProgress(p){ progressFill.style.width=Math.min(100,p)+'%'; }

const LOADER_SHOWN_KEY = 'loader_shown';
function shouldShowLoader() {
  if (sessionStorage.getItem(LOADER_SHOWN_KEY)) return false;
  sessionStorage.setItem(LOADER_SHOWN_KEY, '1');
  return true;
}

async function boot() {
  const showLoader = shouldShowLoader();
  if (showLoader) {
    loaderScreen.style.display = 'flex';
    appContainer.style.display = 'none';
    addLog('正在加载资源…'); setProgress(5);
  }

  if (typeof marked === 'undefined') {
    if (showLoader) addLog('等待 Markdown 解析库…');
    await new Promise(r => { let n=0; const i=setInterval(()=>{ if(typeof marked!=='undefined'||n++>30){clearInterval(i);r();} },200); });
  }

  if (showLoader) { addLog('加载配置…'); setProgress(10); }
  try { await Chat.loadConfig(); } catch(e) {
    if (showLoader) addLog('配置加载失败');
    console.error(e);
    return;
  }

  if (showLoader) {
    ['css/ui.css','css/data.css','js/chat.js'].forEach(async (f,i) => {
      await new Promise(r=>setTimeout(r,300));
      addLog(`已加载 ${f}`); setProgress(20+(i+1)*15);
    });
    await new Promise(r=>setTimeout(r,900));
  }

  currentUser = (await Login.getCurrentUser()) || 'guest';
  if (showLoader) { addLog(`当前用户：${currentUser}`); setProgress(60); }

  if (currentUser !== 'guest') {
    try {
      await Chat.ensureUserFolder(currentUser);
      const rawIndex = await Chat.fetchIndex(currentUser);
      indexList = rawIndex.filter(item => item && item.id && item.title);
      if (showLoader) addLog(`云端索引已加载 (${indexList.length})`);
      if (showLoader) setProgress(80);
      if (indexList.length > 0) {
        const lid = indexList[0].id;
        try { const { content } = await Chat.getFile(currentUser, `${lid}.txt`); chatCache[lid] = content; currentChatId = lid; chatTitleDisplay.textContent = indexList[0].title; renderMessages(lid); } catch (e) {}
      }
    } catch(e) { if (showLoader) addLog('加载云端数据失败'); }
  } else {
    indexList = [];
    chatTitleDisplay.textContent = 'AI Chat';
    messagesArea.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">forum</span><h2>开始对话</h2><p>输入消息开始（访客模式不保存）</p></div>';
  }

  renderSidebar();
  userNameDisplay.textContent = currentUser === 'guest' ? '访客' : escapeHtml(currentUser);

  // ===== 等待图标字体加载完成 =====
  if (showLoader) {
    addLog('加载图标字体…');
    setProgress(90);
    // 等待字体就绪（若已缓存会立即通过）
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  }
  // 字体加载完毕，允许图标显示
  document.body.classList.add('fonts-loaded');
  // ===============================

  if (showLoader) {
    setProgress(100); addLog('就绪');
    setTimeout(() => {
      loaderScreen.style.display = 'none';
      appContainer.style.display = 'flex';
      // 访客自动弹出登录窗
      if (currentUser === 'guest') {
        loginOverlay.style.display = 'flex';
      }
      // 检查捐赠弹窗
      if (currentUser !== 'guest' && shouldShowDonation(currentUser)) {
        setTimeout(showDonationModal, 600);
      }
    }, 300);
  } else {
    loaderScreen.style.display = 'none';
    appContainer.style.display = 'flex';
    if (currentUser === 'guest') {
      loginOverlay.style.display = 'flex';
    }
    if (currentUser !== 'guest' && shouldShowDonation(currentUser)) {
      setTimeout(showDonationModal, 600);
    }
  }
}

// ================== 事件绑定 ==================
loginNavBtn.addEventListener('click', async () => {
  if (currentUser !== 'guest') {
    const ok = await customConfirm('确定要登出吗？');
    if (ok) Login.logout();
    return;
  }
  loginOverlay.style.display = 'flex';
});
closeLoginBtn.addEventListener('click', () => { loginOverlay.style.display = 'none'; });
guestBtnElem.addEventListener('click', () => { loginOverlay.style.display = 'none'; });
loginSubmitBtn.addEventListener('click', async () => {
  const username = loginUserInput.value.trim();
  const password = loginPassInput.value;
  if (!username) return;
  const success = await Login.login(username, password);
  if (success) {
    sessionStorage.removeItem(LOADER_SHOWN_KEY);
    localStorage.setItem('force_donation', '1');
    location.reload();
  } else {
    loginErrorEl.style.display = 'block';
    loginErrorEl.textContent = '用户名或密码错误';
  }
});

function openSidebar(){ if(window.innerWidth<768){ sidebar.classList.add('open');overlay.classList.add('show'); }else{ sidebar.classList.remove('collapsed');menuBtn.style.display='none'; } }
function closeSidebar(){ if(window.innerWidth<768){ sidebar.classList.remove('open');overlay.classList.remove('show'); }else{ sidebar.classList.add('collapsed');menuBtn.style.display='flex'; } }
collapseBtn.addEventListener('click', ()=>{closeSidebar();playSound('click');});
menuBtn.addEventListener('click', ()=>{openSidebar();playSound('click');});
overlay.addEventListener('click', closeSidebar);
window.addEventListener('resize', ()=>{ if(window.innerWidth<768)menuBtn.style.display='flex'; else menuBtn.style.display=sidebar.classList.contains('collapsed')?'flex':'none'; });

newChatBtn.addEventListener('click', createNewChat);
sendBtn.addEventListener('click', handleSend);
messageInput.addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } });
messageInput.addEventListener('input', ()=>{ messageInput.style.height='auto'; messageInput.style.height=Math.min(messageInput.scrollHeight,160)+'px'; });
uploadBtn.addEventListener('click', async ()=>{
  if(currentUser==='guest'){ showToast('访客无法上传'); return; }
  const ok = await customConfirm('确定上传所有本地对话并清空缓存吗？');
  if (ok) uploadWithProgress();
});
themeBtn.addEventListener('click', ()=>{ applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'); playSound('click'); });

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = themeBtn.querySelector('.material-symbols-outlined');
  if(icon) icon.textContent = theme==='dark'?'light_mode':'dark_mode';
  localStorage.setItem(THEME_KEY, theme);
}
(function(){
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
})();

(function startHueAnimation() {
  const root=document.documentElement; let hue=Math.floor(Math.random()*360), speed=1.2, last=performance.now();
  function step(now){ const dt=Math.min(0.1,(now-last)/1000); last=now; hue=(hue+speed*dt)%360; root.style.setProperty('--md-sys-hue', Math.round(hue)); requestAnimationFrame(step); }
  requestAnimationFrame(step);
})();

document.addEventListener('click', initAudio, {once:true});
document.addEventListener('keydown', initAudio, {once:true});

boot().catch(err => console.error(err));
