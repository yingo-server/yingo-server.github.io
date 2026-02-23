import { BOARD_SIZE } from '../utils/constants.js';

const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

function analyzeDirection(board, row, col, player, dx, dy) {
    let count = 1;
    let leftEmpty = false, rightEmpty = false;
    let leftBlocked = false, rightBlocked = false;

    for (let step = 1; step < 5; step++) {
        const nr = row + dx * step;
        const nc = col + dy * step;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
            rightBlocked = true;
            break;
        }
        if (board[nr][nc] === player) {
            count++;
        } else if (board[nr][nc] === 0) {
            rightEmpty = true;
            break;
        } else {
            rightBlocked = true;
            break;
        }
    }

    for (let step = 1; step < 5; step++) {
        const nr = row - dx * step;
        const nc = col - dy * step;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
            leftBlocked = true;
            break;
        }
        if (board[nr][nc] === player) {
            count++;
        } else if (board[nr][nc] === 0) {
            leftEmpty = true;
            break;
        } else {
            leftBlocked = true;
            break;
        }
    }

    return { count, leftEmpty, rightEmpty, leftBlocked, rightBlocked };
}

/**
 * 获取指定位置落子后，该玩家形成的最高威胁分数
 * 分数定义：
 * 10000 = 连五
 * 1100  = 对手冲四（防守）
 * 1060  = 活四（进攻）
 * 1050  = 活三（进攻或防守）
 * 950   = 眠三
 * 850   = 活二
 * 800   = 眠二
 * 750   = 眠一
 * 0     = 无威胁
 */
export function getThreatLevel(board, row, col, player) {
    if (board[row][col] !== 0) return 0;

    const tempBoard = board.map(row => [...row]);
    tempBoard[row][col] = player;

    let maxScore = 0;

    for (let [dx, dy] of DIRECTIONS) {
        const { count, leftEmpty, rightEmpty, leftBlocked, rightBlocked } = analyzeDirection(tempBoard, row, col, player, dx, dy);

        if (count >= 5) {
            return 10000;
        }

        const openEnds = (leftEmpty ? 1 : 0) + (rightEmpty ? 1 : 0);

        if (count === 4) {
            if (openEnds === 2) {
                maxScore = Math.max(maxScore, 1060); // 活四
            } else {
                maxScore = Math.max(maxScore, 1100); // 冲四
            }
        } else if (count === 3) {
            if (openEnds === 2) {
                maxScore = Math.max(maxScore, 1050); // 活三
            } else if (openEnds === 1) {
                maxScore = Math.max(maxScore, 950); // 眠三
            } else {
                maxScore = Math.max(maxScore, 800); // 死三（作眠二）
            }
        } else if (count === 2) {
            if (openEnds === 2) {
                maxScore = Math.max(maxScore, 850); // 活二
            } else if (openEnds === 1) {
                maxScore = Math.max(maxScore, 800); // 眠二
            }
        } else if (count === 1) {
            if (openEnds >= 1) {
                maxScore = Math.max(maxScore, 750); // 眠一
            }
        }
    }

    return maxScore;
}