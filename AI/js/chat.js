// ============================================================
//  chat.js — API 交互 & 文件存储 (遵循 Gitee API 文档)
// ============================================================
window.Chat = (function() {
  let config = null;

  async function loadConfig() {
    const res = await fetch('config.json');
    config = await res.json();
    return config;
  }

  function getConfig() {
    if (!config) throw new Error('配置未加载');
    return config;
  }

  // ---------- AI 流式请求 ----------
  async function streamChat(messages, onChunk) {
    const { ai } = getConfig();
    const response = await fetch(ai.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ai.apiKey}`
      },
      body: JSON.stringify({
        model: ai.model,
        temperature: ai.temperature,
        messages: [
          { role: 'system', content: ai.systemPrompt },
          ...messages
        ],
        stream: true
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch (e) { /* ignore */ }
      }
    }
  }

  // ---------- Gitee API 封装 ----------
  function giteeUrl(path) {
    const { gitee } = getConfig();
    const base = `https://gitee.com/api/v5/repos/${gitee.owner}/${gitee.repo}/contents/${gitee.folder}${path}`;
    return `${base}?access_token=${gitee.accessToken}`;
  }

  function giteeBody(params) {
    const body = new URLSearchParams();
    for (const key in params) {
      body.append(key, params[key]);
    }
    return body;
  }

  // 获取文件内容 (GET) → 修复中文解码
  async function getGiteeFile(path) {
    const url = giteeUrl(path);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`Gitee API GET ${path} 失败: ${res.status}`);
    const data = await res.json();
    // 核心修复：正确还原中文
    const content = decodeURIComponent(escape(atob(data.content)));
    return { content, sha: data.sha };
  }

  // 新建文件 (POST) → 上传时使用兼容中文的编码
  async function createGiteeFile(path, content, message = '新建对话') {
    const { gitee } = getConfig();
    const url = giteeUrl(path);
    const body = giteeBody({
      content: btoa(unescape(encodeURIComponent(content))),
      message: message,
      branch: gitee.branch
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    });
    if (!res.ok) throw new Error(`Gitee API POST ${path} 失败: ${res.status}`);
    return res.json();
  }

  // 更新文件 (PUT)
  async function updateGiteeFile(path, content, sha, message = '更新对话') {
    const { gitee } = getConfig();
    const url = giteeUrl(path);
    const body = giteeBody({
      content: btoa(unescape(encodeURIComponent(content))),
      sha: sha,
      message: message,
      branch: gitee.branch
    });
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    });
    if (!res.ok) throw new Error(`Gitee API PUT ${path} 失败: ${res.status}`);
    return res.json();
  }

  // 获取索引文件 (index.json)
  async function fetchIndex() {
    try {
      const { content } = await getGiteeFile('index.json');
      const lines = content.trim().split('\n');
      return lines.map(line => {
        const [id, title, order] = line.split(':');
        return { id, title, order: parseInt(order) || 0 };
      });
    } catch (e) {
      return [];
    }
  }

  // 上传索引文件
  async function uploadIndex(indexList) {
    const lines = indexList.map(({ id, title, order }) => `${id}:${title}:${order}`);
    const content = lines.join('\n');
    try {
      const { sha } = await getGiteeFile('index.json');
      await updateGiteeFile('index.json', content, sha, '更新索引');
    } catch {
      await createGiteeFile('index.json', content, '创建索引');
    }
  }

  // 暴露公共 API
  return {
    loadConfig,
    getConfig,
    streamChat,
    getGiteeFile,
    createGiteeFile,
    updateGiteeFile,
    fetchIndex,
    uploadIndex
  };
})();