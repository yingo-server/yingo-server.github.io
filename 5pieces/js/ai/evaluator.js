import { BOARD_SIZE } from '../utils/constants.js';
import { getThreatLevel } from './threat.js';

// 开局库（前3步）
const openingBook = [
    { move: 1, black: [7, 7], white: null },
    { move: 2, black: null, white: [7, 8] },
    { move: 3, black: [8, 7], white: null }
];

/**
 * 生成候选点（曼哈顿距离≤2的空位）
 */
function generateCandidates(board) {
    const candidatesSet = new Set();
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== 0) {
                for (let dr = -2; dr <= 2; dr++) {
                    for (let dc = -2; dc <= 2; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === 0) {
                            const dist = Math.abs(dr) + Math.abs(dc);
                            if (dist <= 2) {
                                candidatesSet.add(nr * BOARD_SIZE + nc);
                            }
                        }
                    }
                }
            }
        }
    }
    const candidates = Array.from(candidatesSet).map(code => [Math.floor(code / BOARD_SIZE), code % BOARD_SIZE]);
    if (candidates.length === 0) return [[7,7]];
    return candidates;
}

/**
 * 主评估函数：只考虑防守和活四/连五
 */
export function evaluate(board, aiPlayer, step) {
    console.group(`===== AI 决策 (第 ${step + 1} 步，AI 为 ${aiPlayer === 1 ? '黑方' : '白方'}) =====`);

    // 开局库
    if (step <= 3) {
        const entry = openingBook[step - 1];
        if (entry) {
            const move = aiPlayer === 1 ? entry.black : entry.white;
            if (move) {
                console.log('使用开局库:', move);
                console.groupEnd();
                return move;
            }
        }
    }

    const opponent = aiPlayer === 1 ? 2 : 1;

    // 生成候选点
    const candidates = generateCandidates(board);
    if (candidates.length === 0) {
        console.log('无候选点，返回中心');
        console.groupEnd();
        return [7, 7];
    }

    console.log('候选点列表:', candidates.map(p => `(${p[0]},${p[1]})`).join(', '));

    const scoredMoves = [];

    for (let [r, c] of candidates) {
        // 进攻价值：只考虑活四（1060）和连五（10000）
        const attack = getThreatLevel(board, r, c, aiPlayer);
        // 防守价值：对手在此落子的威胁
        const defense = getThreatLevel(board, r, c, opponent);
        // 综合评分：取最大值，但防守分可能包含对手活三/冲四，进攻分只保留活四/连五
        const score = Math.max(attack, defense);

        scoredMoves.push({ move: [r, c], attack, defense, score });

        let logMsg = `(${r},${c}) 进攻=${attack}`;
        if (attack >= 10000) logMsg += ' (连五!)';
        else if (attack === 1060) logMsg += ' (活四!)';
        logMsg += `, 防守=${defense}, 综合=${score}`;
        console.log(logMsg);
    }

    // 按综合评分降序
    scoredMoves.sort((a, b) => b.score - a.score);
    const maxScore = scoredMoves[0].score;
    const topMoves = scoredMoves.filter(m => m.score === maxScore);

    console.log(`最高综合分: ${maxScore}，共有 ${topMoves.length} 个候选`);

    // 同分时随机选择
    const idx = Math.floor(Math.random() * topMoves.length);
    const best = topMoves[idx].move;
    console.log(`最终选择: (${best[0]},${best[1]})`);
    console.groupEnd();

    return best;
}