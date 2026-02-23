// Gitee API 基础操作
import { utf8ToBase64, base64ToUtf8 } from '../utils/helpers.js';

const BASE_URL = 'https://gitee.com/api/v5';

// 自定义 API 错误类
class GiteeAPIError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'GiteeAPIError';
        this.code = code;
    }
}

/**
 * 获取文件内容
 */
export async function giteeGetFile(path) {
    const config = window.GITEE_CONFIG;
    if (!config) throw new GiteeAPIError('CONFIG_MISSING', 'Gitee 配置未找到');
    const url = `${BASE_URL}/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}&access_token=${config.token}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            if (res.status === 404) return null;
            const errorData = await res.json().catch(() => ({}));
            throw new GiteeAPIError(`API_${res.status}`, errorData.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (Array.isArray(data)) return null;
        const content = base64ToUtf8(data.content);
        return { content, sha: data.sha };
    } catch (e) {
        if (e instanceof GiteeAPIError) throw e;
        throw new GiteeAPIError('NETWORK_ERROR', '网络连接失败，请检查网络');
    }
}

/**
 * 创建文件（POST）
 */
export async function giteeCreateFile(path, content, message = 'create file') {
    const config = window.GITEE_CONFIG;
    if (!config) throw new GiteeAPIError('CONFIG_MISSING', 'Gitee 配置未找到');
    const url = `${BASE_URL}/repos/${config.owner}/${config.repo}/contents/${path}`;
    const base64Content = utf8ToBase64(content);
    const body = {
        access_token: config.token,
        content: base64Content,
        message,
        branch: config.branch
    };
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new GiteeAPIError(`API_${res.status}`, errorData.message || `HTTP ${res.status}`);
        }
        return true;
    } catch (e) {
        if (e instanceof GiteeAPIError) throw e;
        throw new GiteeAPIError('NETWORK_ERROR', '网络连接失败，请检查网络');
    }
}

/**
 * 更新文件（PUT）
 */
export async function giteeUpdateFile(path, content, sha, message = 'update file') {
    const config = window.GITEE_CONFIG;
    if (!config) throw new GiteeAPIError('CONFIG_MISSING', 'Gitee 配置未找到');
    const url = `${BASE_URL}/repos/${config.owner}/${config.repo}/contents/${path}`;
    const base64Content = utf8ToBase64(content);
    const body = {
        access_token: config.token,
        content: base64Content,
        sha,
        message,
        branch: config.branch
    };
    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new GiteeAPIError(`API_${res.status}`, errorData.message || `HTTP ${res.status}`);
        }
        return true;
    } catch (e) {
        if (e instanceof GiteeAPIError) throw e;
        throw new GiteeAPIError('NETWORK_ERROR', '网络连接失败，请检查网络');
    }
}

/**
 * 删除文件（DELETE）
 */
export async function giteeDeleteFile(path, sha, message = 'delete file') {
    const config = window.GITEE_CONFIG;
    if (!config) throw new GiteeAPIError('CONFIG_MISSING', 'Gitee 配置未找到');
    const url = `${BASE_URL}/repos/${config.owner}/${config.repo}/contents/${path}`;
    const body = {
        access_token: config.token,
        sha,
        message,
        branch: config.branch
    };
    try {
        const res = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new GiteeAPIError(`API_${res.status}`, errorData.message || `HTTP ${res.status}`);
        }
        return true;
    } catch (e) {
        if (e instanceof GiteeAPIError) throw e;
        throw new GiteeAPIError('NETWORK_ERROR', '网络连接失败，请检查网络');
    }
}