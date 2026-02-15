// 依赖 config.js 中的 GITHUB 对象

/**
 * 根据对话名获取下一个可用序号（通过列出 chats/ 目录）
 * @param {string} conversationName 
 * @returns {Promise<number>} 下一个序号（1,2,3...）
 */
async function getNextConversationNumber(conversationName) {
    const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${GITHUB.path}`;
    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${GITHUB.token}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        let maxNum = 0;
        if (response.status === 200) {
            const files = await response.json();
            const regex = new RegExp(`^chat_${conversationName}_(\\d+)\\.txt$`);
            files.forEach(file => {
                const match = file.name.match(regex);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            });
        } else if (response.status === 404) {
            // 目录还不存在，视为空
        } else {
            console.error('获取文件列表失败:', response.status);
        }
        return maxNum + 1;
    } catch (error) {
        console.error('GitHub API 调用异常:', error);
        return 1; // 出错时默认从1开始，避免阻塞
    }
}

/**
 * 将当前全部消息覆盖写入 chat_对话名_序号.txt
 * @param {string} conversationName 
 * @param {number} convNumber 
 * @param {Array} messages 消息数组 [{role, content, timestamp}, ...]
 * @returns {Promise<void>}
 */
async function uploadFullConversation(conversationName, convNumber, messages) {
    // 生成文件内容：每行 "时间戳：人类/AI：内容"
    const lines = messages.map(msg => {
        const role = msg.role === 'human' ? '人类' : 'AI';
        return `${msg.timestamp}：${role}：${msg.content}`;
    });
    const contentText = lines.join('\n');

    const fileName = `chat_${conversationName}_${convNumber}.txt`;
    const filePath = GITHUB.path + fileName;
    const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${filePath}`;

    // 先尝试获取已有文件的 sha（如果要覆盖，必须提供 sha）
    let sha = null;
    try {
        const getResp = await fetch(url, {
            headers: {
                Authorization: `Bearer ${GITHUB.token}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        if (getResp.status === 200) {
            const data = await getResp.json();
            sha = data.sha;
        }
    } catch (e) {
        console.warn('获取文件sha失败，将新建', e);
    }

    // 准备上传
    const body = {
        message: `对话存档: ${fileName}`,
        content: btoa(unescape(encodeURIComponent(contentText))) // Unicode 安全 base64
    };
    if (sha) body.sha = sha;

    try {
        const putResp = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${GITHUB.token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (putResp.status === 200 || putResp.status === 201) {
            console.log(`✅ 上传成功: ${fileName} (${messages.length} 条消息)`);
        } else {
            console.error('❌ 上传失败:', await putResp.json());
        }
    } catch (error) {
        console.error('❌ 上传异常:', error);
    }
}