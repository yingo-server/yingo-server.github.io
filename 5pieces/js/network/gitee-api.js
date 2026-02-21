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
 * @param {string} path 文件路径（如 rooms/list.txt）
 * @returns {Promise<{ content: string, sha: string } | null>} 如果是文件返回对象，如果是目录或不存在返回 null
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
            throw new GiteeAPIError(
                `API_${res.status}`,
                errorData.message || `HTTP ${res.status}`
            );
        }
        const data = await res.json();
        // 检查返回的是否是文件对象（如果是数组则是目录）
        if (Array.isArray(data)) {
            return null;
        }
        // 关键修复：使用 base64ToUtf8 正确解码中文
        const content = base64ToUtf8(data.content);
        return { content, sha: data.sha };
    } catch (e) {
        if (e instanceof GiteeAPIError) throw e;
        throw new GiteeAPIError('NETWORK_ERROR', '网络连接失败，请检查网络');
    }
}

/**
 * 创建文件（使用 POST）
 * @param {string} path 文件路径
 * @param {string} content 文件内容（支持中文）
 * @param {string} message 提交信息
 * @returns {Promise<boolean>}
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
            throw new GiteeAPIError(
                `API_${res.status}`,
                errorData.message || `HTTP ${res.status}`
            );
        }
        return true;
    } catch (e) {
        if (e instanceof GiteeAPIError) throw e;
        throw new GiteeAPIError('NETWORK_ERROR', '网络连接失败，请检查网络');
    }
}

/**
 * 更新文件（使用 PUT）
 * @param {string} path 文件路径
 * @param {string} content 新内容（支持中文）
 * @param {string} sha 当前文件的 SHA
 * @param {string} message 提交信息
 * @returns {Promise<boolean>}
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
            throw new GiteeAPIError(
                `API_${res.status}`,
                errorData.message || `HTTP ${res.status}`
            );
        }
        return true;
    } catch (e) {
        if (e instanceof GiteeAPIError) throw e;
        throw new GiteeAPIError('NETWORK_ERROR', '网络连接失败，请检查网络');
    }
}