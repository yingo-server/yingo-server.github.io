// ============================================================
//  chat.js — 稳健的 API 交互 & 文件存储
//  移除所有复杂缓冲区，SSE 解析使用标准行分割
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

  // ---------- AI 流式请求（经典且稳健） ----------
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
        messages: messages,
        stream: true
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let remainder = ''; // 未完成的行

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = (remainder + chunk).split('\n');
      // 最后一行可能不完整，保留到下次
      remainder = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') return;

        try {
          const json = JSON.parse(dataStr);
          const content = json.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch (e) {
          // 忽略非 JSON 行（如空行、注释等）
        }
      }
    }
  }

  // ---------- Gitee API 封装 ----------
  function giteeUrl(path) {
    const { gitee } = getConfig();
    return `https://gitee.com/api/v5/repos/${gitee.owner}/${gitee.repo}/contents/${gitee.folder}${path}?access_token=${gitee.accessToken}`;
  }

  function giteeBody(params) {
    const body = new URLSearchParams();
    for (const key in params) body.append(key, params[key]);
    return body;
  }

  async function getGiteeFile(path) {
    const res = await fetch(giteeUrl(path), { method: 'GET' });
    if (!res.ok) throw new Error(`Gitee API GET ${path} 失败: ${res.status}`);
    const data = await res.json();
    const content = decodeURIComponent(escape(atob(data.content)));
    return { content, sha: data.sha };
  }

  async function createGiteeFile(path, content, message = '新建对话') {
    const { gitee } = getConfig();
    const body = giteeBody({
      content: btoa(unescape(encodeURIComponent(content))),
      message: message,
      branch: gitee.branch
    });
    const res = await fetch(giteeUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    });
    if (!res.ok) throw new Error(`Gitee API POST ${path} 失败: ${res.status}`);
    return res.json();
  }

  async function updateGiteeFile(path, content, sha, message = '更新对话') {
    const { gitee } = getConfig();
    const body = giteeBody({
      content: btoa(unescape(encodeURIComponent(content))),
      sha: sha,
      message: message,
      branch: gitee.branch
    });
    const res = await fetch(giteeUrl(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    });
    if (!res.ok) throw new Error(`Gitee API PUT ${path} 失败: ${res.status}`);
    return res.json();
  }

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