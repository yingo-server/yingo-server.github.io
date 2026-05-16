window.Chat = (function() {
  let config = null;

  async function loadConfig() {
    const res = await fetch('config.json');
    if (!res.ok) throw new Error('无法加载 config.json');
    config = await res.json();
    return config;
  }

  function getConfig() {
    if (!config) throw new Error('配置未加载');
    return config;
  }

  function giteeUrl(userPath, file) {
    const { gitee } = config;
    const folder = gitee.folder.replace(/\/?$/, '/');
    const path = userPath ? `${folder}${userPath}/${file}` : `${folder}${file}`;
    return `https://gitee.com/api/v5/repos/${gitee.owner}/${gitee.repo}/contents/${path}?access_token=${gitee.accessToken}`;
  }

  function giteeBody(params) {
    const body = new URLSearchParams();
    for (const key in params) body.append(key, params[key]);
    return body;
  }

  async function getFile(userPath, file) {
    const res = await fetch(giteeUrl(userPath, file));
    if (!res.ok) throw new Error(`GET ${file} 失败: ${res.status}`);
    const data = await res.json();
    const content = decodeURIComponent(escape(atob(data.content)));
    return { content, sha: data.sha };
  }

  async function createFile(userPath, file, content, message = '创建文件') {
    const { gitee } = config;
    const body = giteeBody({
      content: btoa(unescape(encodeURIComponent(content))),
      message,
      branch: gitee.branch
    });
    const res = await fetch(giteeUrl(userPath, file), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!res.ok) throw new Error(`POST ${file} 失败: ${res.status}`);
    return res.json();
  }

  async function updateFile(userPath, file, content, sha, message = '更新文件') {
    const { gitee } = config;
    const body = giteeBody({
      content: btoa(unescape(encodeURIComponent(content))),
      sha,
      message,
      branch: gitee.branch
    });
    const res = await fetch(giteeUrl(userPath, file), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!res.ok) throw new Error(`PUT ${file} 失败: ${res.status}`);
    return res.json();
  }

  async function streamChat(messages, onChunk) {
    const { ai } = config;
    const response = await fetch(ai.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ai.apiKey}`
      },
      body: JSON.stringify({ model: ai.model, temperature: ai.temperature, messages, stream: true })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let remainder = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = (remainder + chunk).split('\n');
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
        } catch (e) {}
      }
    }
  }

  async function getUsersIndex() {
    try {
      const { content } = await getFile('', 'users_index.json');
      return content.trim().split('\n').filter(Boolean);
    } catch (e) { return []; }
  }

  async function saveUsersIndex(users) {
    const content = users.join('\n');
    try {
      const { sha } = await getFile('', 'users_index.json');
      await updateFile('', 'users_index.json', content, sha, '更新用户索引');
    } catch {
      await createFile('', 'users_index.json', content, '创建用户索引');
    }
  }

  async function fetchIndex(username) {
    try {
      const { content } = await getFile(username, 'index.json');
      const lines = content.trim().split('\n').filter(line => line.trim() !== '');
      return lines.map(line => {
        const [id, title, order] = line.split(':');
        if (!id) return null;
        return { id: id.trim(), title: title ? title.trim() : '未命名', order: parseInt(order) || 0 };
      }).filter(Boolean);
    } catch (e) { return []; }
  }

  async function uploadIndex(username, indexList) {
    const lines = indexList.map(({ id, title, order }) => `${id}:${title}:${order}`);
    const content = lines.join('\n');
    try {
      const { sha } = await getFile(username, 'index.json');
      await updateFile(username, 'index.json', content, sha, '更新索引');
    } catch {
      await createFile(username, 'index.json', content, '创建索引');
    }
  }

  async function ensureUserFolder(username) {
    try { await getFile(username, 'index.json'); } catch {
      await createFile(username, 'index.json', '\n', '初始化用户文件夹');
    }
  }

  return {
    loadConfig, getConfig, streamChat,
    getFile, createFile, updateFile,
    getUsersIndex, saveUsersIndex,
    fetchIndex, uploadIndex, ensureUserFolder
  };
})();