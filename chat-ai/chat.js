// 依赖 config.js, update.js, marked.js

let currentConversationName = '';
let currentConversationNumber = 0;
let messages = [];

const setupDiv = document.getElementById('name-setup');
const chatDiv = document.getElementById('chat-interface');
const nameInput = document.getElementById('conversation-name');
const startBtn = document.getElementById('start-btn');
const messagesContainer = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const initProgress = document.getElementById('init-progress'); // 新增进度条元素

// ---------- 绑定事件 ----------
startBtn.addEventListener('click', initializeConversation);
nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') initializeConversation();
});
sendBtn.addEventListener('click', () => sendMessage());
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// ---------- 开始新对话（自动执行预设提示词）----------
async function initializeConversation() {
    const rawName = nameInput.value.trim();
    if (!rawName) {
        alert('请输入对话名称');
        return;
    }
    currentConversationName = rawName.replace(/\s+/g, '_');
    currentConversationNumber = await getNextConversationNumber(currentConversationName);

    messages = [];
    renderMessages();

    // 切换到聊天界面，立即显示进度条，禁用输入
    setupDiv.style.display = 'none';
    chatDiv.style.display = 'flex';
    userInput.disabled = true;
    sendBtn.disabled = true;
    userInput.style.display = 'none';
    sendBtn.style.display = 'none';
    initProgress.style.display = 'flex';

    // 按顺序执行预设提示词
    for (let i = 0; i < PRE_PROMPTS.length; i++) {
        const promptText = PRE_PROMPTS[i];
        // 发送预设消息（使用统一的 sendPrompt）
        await sendPrompt(promptText, i + 1); // 传入序号用于错误提示
    }

    // 全部完成：隐藏进度条，启用输入，聚焦
    initProgress.style.display = 'none';
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.style.display = 'block';
    sendBtn.style.display = 'flex';
    userInput.focus();

    console.log(`对话启动，预设执行完毕: ${currentConversationName}_${currentConversationNumber}`);
}

// ---------- 统一的发送函数（供预设和用户输入调用）----------
async function sendPrompt(text, promptIndex = null) {
    // 人类消息
    const humanMsg = {
        role: 'human',
        content: text,
        timestamp: getCurrentTimestamp()
    };
    messages.push(humanMsg);
    appendMessageToUI(humanMsg);

    // AI 消息占位
    const aiMsg = {
        role: 'ai',
        content: '',
        timestamp: getCurrentTimestamp()
    };
    messages.push(aiMsg);
    const aiElement = appendMessageToUI(aiMsg, true);

    // 调用流式 API
    await callAIStream(messages, aiElement, aiMsg);

    // 检查 AI 回复是否包含错误（用于弹框提示）
    if (promptIndex !== null && aiMsg.content.startsWith('[错误')) {
        alert(`第 ${promptIndex} 个预设提示词执行失败，请检查网络或API配置。`);
    }

    // 触发上传检查
    if (messages.length % UPLOAD_TRIGGER_STEP === 0) {
        uploadFullConversation(currentConversationName, currentConversationNumber, messages);
    }
}

// ---------- 用户发送消息（复用 sendPrompt）----------
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    userInput.value = '';
    await sendPrompt(text);
}

// ---------- 流式 AI 请求（与之前一致，无需修改）----------
async function callAIStream(messageHistory, aiElement, aiMsg) {
    const openAIMessages = [
        // 注意：此处不再使用 SYSTEM_PROMPT，因为预设已作为用户消息发送
        ...messageHistory.slice(0, -1).map(m => ({
            role: m.role === 'human' ? 'user' : 'assistant',
            content: m.content
        }))
    ];

    try {
        const response = await fetch(AI_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: AI_CONFIG.model,
                messages: openAIMessages,
                stream: true,
                stream_options: { include_usage: false }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('AI 流式错误:', response.status, err);
            aiMsg.content = `[错误 ${response.status}]`;
            updateAIMessageContent(aiElement, aiMsg.content);
            return;
        }

        if (!response.body) {
            throw new Error('ReadableStream not supported');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullContent += delta;
                            aiMsg.content = fullContent;
                            updateAIMessageContent(aiElement, fullContent);
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    } catch (e) {
                        console.warn('JSON 解析失败，暂存等待后续数据:', e);
                        buffer = line + '\n\n' + buffer;
                    }
                }
            }
        }

        aiMsg.content = fullContent;
        updateAIMessageContent(aiElement, fullContent);

    } catch (error) {
        console.error('流式请求异常:', error);
        aiMsg.content = '[网络错误或流中断]';
        updateAIMessageContent(aiElement, aiMsg.content);
    }
}

// ---------- 辅助：更新 AI 消息（Markdown渲染）----------
function updateAIMessageContent(aiElement, markdownContent) {
    const contentDiv = aiElement.querySelector('div');
    contentDiv.innerHTML = marked.parse(markdownContent, { async: false });
}

// ---------- 渲染全部消息 ----------
function renderMessages() {
    messagesContainer.innerHTML = '';
    messages.forEach(msg => appendMessageToUI(msg));
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ---------- 单条消息追加到UI ----------
function appendMessageToUI(msg, returnElement = false) {
    const div = document.createElement('div');
    div.className = `message ${msg.role === 'human' ? 'human' : 'ai'}`;
    
    const contentDiv = document.createElement('div');
    if (msg.role === 'human') {
        contentDiv.innerText = msg.content;
    } else {
        contentDiv.innerHTML = marked.parse(msg.content || '', { async: false });
    }
    
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'timestamp';
    timestampDiv.innerText = msg.timestamp;
    
    div.appendChild(contentDiv);
    div.appendChild(timestampDiv);
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    if (returnElement) return div;
}

// ---------- 获取当前时间戳 ----------
function getCurrentTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}