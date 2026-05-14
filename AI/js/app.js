// ============================================================
//  app.js — 多行消息存储修复 + 5秒无回复超时结束
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

// ================== 夜间模式 ==================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = themeBtn?.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
  localStorage.setItem(THEME_KEY, theme);
}
function toggleTheme() { applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); playSound('click'); }
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
}

// ================== 工具函数 ==================
function now() {
  const d = new Date();
  return `${String(d.getFullYear()).slice(-2)}:${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}:${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}
function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
}

// 存储时转义换行 → \\n，读取时还原
function encodeNewlines(str) { return str.replace(/\n/g, '\\n'); }
function decodeNewlines(str) { return str.replace(/\\n/g, '\n'); }

function stripThinking(text) {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
}

// ================== 音效 ==================
let audioCtx = null;
function initAudio() { try { audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)(); } catch(e){} }
function playSound(type='click') {
  if (!audioCtx) return;
  const t = audioCtx.currentTime, osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  switch(type) {
    case 'click': osc.frequency.setValueAtTime(800,t); osc.frequency.exponentialRampToValueAtTime(400,t+0.08); gain.gain.setValueAtTime(0.1,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.08); osc.start(t); osc.stop(t+0.08); break;
    case 'send': osc.frequency.setValueAtTime(600,t); osc.frequency.exponentialRampToValueAtTime(1200,t+0.12); gain.gain.setValueAtTime(0.1,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.12); osc.start(t); osc.stop(t+0.12); break;
    case 'receive': osc.frequency.setValueAtTime(1000,t); osc.frequency.exponentialRampToValueAtTime(500,t+0.15); gain.gain.setValueAtTime(0.1,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.15); osc.start(t); osc.stop(t+0.15); break;
    case 'error': osc.frequency.setValueAtTime(200,t); osc.frequency.exponentialRampToValueAtTime(150,t+0.2); gain.gain.setValueAtTime(0.15,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.2); osc.start(t); osc.stop(t+0.2); break;
  }
}

// ================== 轻提示 & 进度弹窗 ==================
function showToast(msg, dur=2500) {
  const el = document.createElement('div'); el.className='snackbar'; el.textContent=msg; document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); el.addEventListener('transitionend',()=>el.remove()); setTimeout(()=>el.remove(),300); }, dur);
}
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

// ================== 存储 ==================
function loadFromStorage(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}catch{return{}} }
function saveToStorage(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function saveChat(id){ if(!id||!chatCache[id])return; const all=loadFromStorage(); all[id]=chatCache[id]; saveToStorage(all); }

// ================== 对话渲染（解析时还原换行） ==================
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
    const match = line.match(/^\[(.+?)\]\[.+?\]：(.+)$/);
    if (!match) continue;
    const [, role, content] = match;
    const isUser = role === '用户';
    const row = document.createElement('div'); row.className = `message-row ${isUser ? 'user' : 'assistant'}`;
    const bubble = document.createElement('div'); bubble.className = `message-bubble ${isUser ? 'user' : 'assistant'}`;
    // 还原换行
    const decodedContent = decodeNewlines(content);
    bubble.innerHTML = (typeof marked !== 'undefined' && marked.parse) ? marked.parse(decodedContent) : escapeHtml(decodedContent);
    row.appendChild(bubble);
    messagesArea.appendChild(row);
  }
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ================== 侧边栏 ==================
function renderSidebar() {
  sidebarList.innerHTML = '';
  if (!indexList.length) { sidebarList.innerHTML='<div class="sidebar-empty">暂无对话</div>'; return; }
  indexList.forEach(({id,title}) => {
    const div = document.createElement('div'); div.className=`chat-item${id===currentChatId?' active':''}`; div.dataset.id=id;
    div.innerHTML=`<span class="material-symbols-outlined">chat_bubble</span><span class="chat-title">${escapeHtml(title)}</span>`;
    div.addEventListener('click', ()=>switchChat(id)); sidebarList.appendChild(div);
  });
}

async function switchChat(id) {
  if (id === currentChatId) return;
  saveChat(currentChatId);
  if (!chatCache[id]) {
    try { const { content } = await Chat.getGiteeFile(`${id}.txt`); chatCache[id] = content; }
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
  const title = prompt('请输入对话标题：'); if (!title) return;
  const maxId = indexList.reduce((max,item)=>Math.max(max,parseInt(item.id)),0);
  const newId = String(maxId+1).padStart(5,'0');
  chatCache[newId] = `标题：${title}\n`;
  currentChatId = newId;
  indexList.unshift({ id:newId, title, order: Date.now() });
  saveChat(newId); renderSidebar(); renderMessages(newId); chatTitleDisplay.textContent=title; playSound('click');
}

// ================== 构建消息上下文（首条附加系统提示词） ==================
function buildMessages(chatId) {
  const systemPrompt = Chat.getConfig?.().ai.systemPrompt || '';
  const lines = chatCache[chatId].split('\n').filter(l => l.startsWith('['));
  const hasAssistant = lines.some(l => l.startsWith('[助手]'));
  return lines.map(line => {
    const m = line.match(/^\[(.+?)\]\[.+?\]：(.+)$/);
    if (!m) return null;
    const role = m[1] === '用户' ? 'user' : 'assistant';
    let content = decodeNewlines(m[2]); // 还原换行
    if (role === 'user' && !hasAssistant) {
      content = `系统提示词（必须）：${systemPrompt}\n用户消息（重要）：${content}`;
    }
    return { role, content };
  }).filter(Boolean);
}

// ================== 核心：流式发送（多行转义 + 5秒超时） ==================
async function handleSend() {
  if (!currentChatId) { showToast('请先选择或新建一个对话'); playSound('error'); return; }
  const input = messageInput.value.trim();
  if (!input || isGenerating) return;

  const cid = currentChatId;
  // 用户消息存储：转义换行
  const encodedInput = encodeNewlines(input);
  const userLine = `[用户][${now()}]：${encodedInput}\n`;
  chatCache[cid] += userLine;
  messageInput.value = ''; messageInput.style.height = 'auto';
  if (currentChatId === cid) renderMessages(cid);
  saveChat(cid);
  playSound('send');

  const messages = buildMessages(cid);

  isGenerating = true; sendBtn.disabled = true;

  // 创建助手容器（思考块 + 正文气泡）
  let assistantRow, thinkBlock, bodyBubble;
  if (currentChatId === cid) {
    assistantRow = document.createElement('div'); assistantRow.className = 'message-row assistant';

    thinkBlock = document.createElement('div');
    thinkBlock.className = 'think-block';
    thinkBlock.innerHTML = `
      <div class="think-summary">
        <span class="material-symbols-outlined">chevron_right</span>
        思考过程
      </div>
      <div class="think-content"></div>
    `;
    thinkBlock.querySelector('.think-summary').addEventListener('click', () => {
      thinkBlock.classList.toggle('open');
    });
    thinkBlock.style.display = 'none';
    assistantRow.appendChild(thinkBlock);

    bodyBubble = document.createElement('div');
    bodyBubble.className = 'message-bubble assistant';
    assistantRow.appendChild(bodyBubble);

    messagesArea.querySelector('.empty-state')?.remove();
    messagesArea.appendChild(assistantRow);
  }

  let rawChunk = '';
  let thinkContent = '';
  let bodyContent = '';
  let inThink = false;
  let streamCompleted = false; // 流是否正常结束
  let reader = null; // 用于取消

  const timeoutMs = 5000;
  let timeoutId = null;

  const resetTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      // 超时：主动取消流
      if (reader) reader.cancel();
      streamCompleted = true;
    }, timeoutMs);
  };

  // 包装 onChunk，增加超时逻辑
  const originalStreamChat = Chat.streamChat;
  await originalStreamChat(messages, (chunk) => {
    resetTimeout(); // 每次收到 chunk 重置计时

    rawChunk += chunk;

    while (rawChunk.length) {
      if (!inThink) {
        const idx = rawChunk.indexOf('<thinking>');
        if (idx === -1) {
          bodyContent += rawChunk;
          rawChunk = '';
        } else {
          bodyContent += rawChunk.slice(0, idx);
          rawChunk = rawChunk.slice(idx + 10);
          inThink = true;
        }
      } else {
        const idx = rawChunk.indexOf('</thinking>');
        if (idx === -1) {
          thinkContent += rawChunk;
          rawChunk = '';
        } else {
          thinkContent += rawChunk.slice(0, idx);
          rawChunk = rawChunk.slice(idx + 11);
          inThink = false;
          if (thinkBlock) {
            thinkBlock.style.display = 'block';
            thinkBlock.querySelector('.think-content').textContent = thinkContent;
            thinkBlock.classList.add('open');
          }
        }
      }
    }

    if (currentChatId === cid && bodyBubble) {
      const cleanBody = bodyContent.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
      bodyBubble.innerHTML = (typeof marked !== 'undefined' && marked.parse) ? marked.parse(cleanBody) : escapeHtml(cleanBody);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
  }).catch(err => {
    console.error('流读取错误', err);
    streamCompleted = true;
  }).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
    streamCompleted = true;
    finishReply();
  });

  // 如果流在超时前正常结束，也会进入 finishReply
  function finishReply() {
    if (inThink) thinkContent = '';
    const finalBody = bodyContent.trim();
    // 存储时转义换行
    const encodedBody = encodeNewlines(stripThinking(finalBody));
    chatCache[cid] += `[助手][${now()}]：${encodedBody}\n`;
    saveChat(cid);
    if (currentChatId === cid) renderMessages(cid);
    isGenerating = false; sendBtn.disabled = false;
    playSound('receive');
  }
}

// ================== 上传 ==================
async function uploadWithProgress() {
  const all = loadFromStorage(); const ids = Object.keys(all);
  if (!ids.length) { showToast('没有需要上传的对话'); return; }
  showUploadModal(); updateUploadProgress(0, `开始上传 ${ids.length} 个对话...`);
  let latestIndex;
  try { latestIndex = await Chat.fetchIndex(); updateUploadProgress(10,'已获取云端索引'); } catch { latestIndex=[]; updateUploadProgress(10,'云端索引不存在'); }
  for (let i=0; i<ids.length; i++) {
    const id = ids[i], content = all[id], title = (content.split('\n')[0]||'').replace('标题：','').trim();
    try {
      const existing = latestIndex.find(it=>it.id===id);
      if (existing) { const { sha } = await Chat.getGiteeFile(`${id}.txt`); await Chat.updateGiteeFile(`${id}.txt`, content, sha); updateUploadProgress(10+(i+1)/ids.length*80, `已更新: ${id}`); }
      else { await Chat.createGiteeFile(`${id}.txt`, content); updateUploadProgress(10+(i+1)/ids.length*80, `已新建: ${id}`); }
      delete all[id]; saveToStorage(all);
    } catch(e) { updateUploadProgress(10+(i+1)/ids.length*80, `失败: ${id}`); }
  }
  const newIdx = {}; latestIndex.forEach(i=>newIdx[i.id]=i); ids.forEach(id=>{ const t=(chatCache[id]?.split('\n')[0]||'').replace('标题：','').trim(); if(t) newIdx[id]={id,title:t,order:Date.now()}; });
  indexList = Object.values(newIdx).sort((a,b)=>b.order-a.order);
  await Chat.uploadIndex(indexList); renderSidebar(); updateUploadProgress(100,'同步完成'); playSound('send'); setTimeout(hideUploadModal,1200);
}

// ================== 启动 ==================
let logLines=[];
function addLog(txt){ const t=new Date().toTimeString().slice(0,8); logLines.push(`[${t}] ${txt}`); if(logLines.length>3)logLines=logLines.slice(-3); loaderLogs.innerHTML=logLines.map(l=>`<div class="log-line">${escapeHtml(l)}</div>`).join(''); }
function setProgress(p){ progressFill.style.width=Math.min(100,p)+'%'; }

async function boot() {
  addLog('正在加载资源...'); setProgress(5);
  if (typeof marked==='undefined') { addLog('等待Markdown解析库...'); await new Promise(r=>{ let n=0; const i=setInterval(()=>{ if(typeof marked!=='undefined'||n++>50){clearInterval(i);r();} },100); }); }
  addLog('正在加载配置...'); setProgress(10);
  try { await Chat.loadConfig(); } catch(e){ addLog('配置加载失败'); console.error(e); return; }
  ['css/ui.css','css/data.css','js/chat.js'].forEach(async (f,i)=>{ await new Promise(r=>setTimeout(r,300)); addLog(`已加载 ${f}`); setProgress(20+(i+1)*15); });
  await new Promise(r=>setTimeout(r,1000));
  addLog('正在同步云端...');
  try { indexList = await Chat.fetchIndex(); addLog(`找到 ${indexList.length} 个云端对话`); } catch { indexList=[]; addLog('无法连接云端'); }
  const local = loadFromStorage();
  for (const id in local) { if (!indexList.find(i=>i.id===id)) { const t=(local[id].split('\n')[0]||'').replace('标题：','').trim(); indexList.push({id,title:t,order:Date.now()}); } chatCache[id]=local[id]; }
  indexList.sort((a,b)=>b.order-a.order);
  if (Object.keys(local).length) { addLog('上传本地草稿...'); await uploadWithProgress(); }
  renderSidebar();
  if (indexList.length) { const lid=indexList[0].id; if(!chatCache[lid]){ try{const{content}=await Chat.getGiteeFile(`${lid}.txt`);chatCache[lid]=content;}catch{chatCache[lid]=`标题：${indexList[0].title}\n`;} } await switchChat(lid); }
  else { chatTitleDisplay.textContent='AI Chat'; messagesArea.innerHTML='<div class="empty-state"><span class="material-symbols-outlined">forum</span><h2>开始对话</h2><p>点击侧边栏新建对话</p></div>'; }
  loaderScreen.style.display='none'; appContainer.style.display='flex';
}

// ================== 侧边栏交互 ==================
function openSidebar(){ if(window.innerWidth<768){ sidebar.classList.add('open');overlay.classList.add('show'); }else{ sidebar.classList.remove('collapsed');menuBtn.style.display='none'; } }
function closeSidebar(){ if(window.innerWidth<768){ sidebar.classList.remove('open');overlay.classList.remove('show'); }else{ sidebar.classList.add('collapsed');menuBtn.style.display='flex'; } }
collapseBtn.addEventListener('click',()=>{closeSidebar();playSound('click');});
menuBtn.addEventListener('click',()=>{openSidebar();playSound('click');});
overlay.addEventListener('click',closeSidebar);
window.addEventListener('resize',()=>{ if(window.innerWidth<768)menuBtn.style.display='flex'; else menuBtn.style.display=sidebar.classList.contains('collapsed')?'flex':'none'; });

// ================== 事件绑定 ==================
newChatBtn.addEventListener('click', createNewChat);
sendBtn.addEventListener('click', handleSend);
messageInput.addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } });
messageInput.addEventListener('input', ()=>{ messageInput.style.height='auto'; messageInput.style.height=Math.min(messageInput.scrollHeight,160)+'px'; });
uploadBtn.addEventListener('click', ()=>{ initAudio(); if(confirm('确定上传所有本地对话并清空缓存吗？')) uploadWithProgress(); });
themeBtn.addEventListener('click', toggleTheme);

// ================== 动态色相 ==================
(function(){
  const root=document.documentElement; let hue=Math.floor(Math.random()*360), speed=1.2, last=performance.now();
  function step(now){ const dt=Math.min(0.1,(now-last)/1000); last=now; hue=(hue+speed*dt)%360; root.style.setProperty('--md-sys-hue', Math.round(hue)); requestAnimationFrame(step); }
  requestAnimationFrame(step);
})();

initTheme();
document.addEventListener('click', initAudio, {once:true});
document.addEventListener('keydown', initAudio, {once:true});

boot().catch(err => { addLog(`启动失败: ${err.message}`); console.error(err); });