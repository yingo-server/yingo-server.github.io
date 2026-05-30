// 国际象棋引擎 (FEN, 移动生成, 合法性, 将军/将杀/逼和)
const FA_CHESS = {
    king: '\uf43f', queen: '\uf445', rook: '\uf447', bishop: '\uf43a', knight: '\uf441', pawn: '\uf443'
};
const DIR_KNIGHT = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const DIR_KING   = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const DIR_SLIDE  = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

class ChessEngine {
    constructor(fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        this.loadFEN(fen);
        this.moveCount = 1;      // 服务端同步用
        this.lastValidFen = fen; // 用于异常回滚
    }

    loadFEN(fen) {
        const parts = fen.split(' ');
        if (parts.length < 6) {
            console.error('Invalid FEN format');
            return;
        }
        const newBoard = new Array(64).fill(null);
        let row = 0, col = 0;
        for (const ch of parts[0]) {
            if (ch === '/') { row++; col = 0; continue; }
            if (ch >= '1' && ch <= '8') { col += parseInt(ch); continue; }
            const color = ch === ch.toUpperCase() ? 'white' : 'black';
            const typeMap = { 'k':'king', 'q':'queen', 'r':'rook', 'b':'bishop', 'n':'knight', 'p':'pawn' };
            newBoard[row*8+col] = { type: typeMap[ch.toLowerCase()], color };
            col++;
        }

        // 棋盘合法性校验
        if (!this.isBoardValid(newBoard)) {
            console.error('Invalid board state detected, rejecting FEN');
            // 恢复上一次有效棋盘（如果存在）
            if (this.board) return;
        }

        this.board = newBoard;
        this.turn = parts[1] === 'w' ? 'white' : 'black';
        this.castling = {
            wK: parts[2].includes('K'), wQ: parts[2].includes('Q'),
            bK: parts[2].includes('k'), bQ: parts[2].includes('q')
        };
        this.epTarget = parts[3] === '-' ? -1 : (8 - parseInt(parts[3][1])) * 8 + (parts[3].charCodeAt(0) - 97);
        this.halfMoves = parseInt(parts[4]);
        this.fullMove = parseInt(parts[5]);
        this.updateKingPositions();
        this.lastValidFen = fen;
    }

    isBoardValid(board) {
        let whiteKing = 0, blackKing = 0;
        for (let i = 0; i < 64; i++) {
            const p = board[i];
            if (!p) continue;
            if (p.type === 'king') {
                if (p.color === 'white') whiteKing++;
                else blackKing++;
            }
            // 兵不能出现在底线或次底线？只做基本检查
            if (p.type === 'pawn') {
                const r = Math.floor(i / 8);
                if (r === 0 || r === 7) return false;
            }
        }
        if (whiteKing !== 1 || blackKing !== 1) {
            console.warn(`Invalid king count: white=${whiteKing}, black=${blackKing}`);
            return false;
        }
        // 可添加更多检查，如：每方最多8个兵，两个王不相邻等
        return true;
    }

    updateKingPositions() {
        this.wkIdx = this.bkIdx = -1;
        for (let i = 0; i < 64; i++) {
            const p = this.board[i];
            if (p && p.type === 'king') {
                if (p.color === 'white') this.wkIdx = i;
                else this.bkIdx = i;
            }
        }
    }

    getFEN() {
        let fen = '';
        for (let r = 0; r < 8; r++) {
            let empty = 0;
            for (let c = 0; c < 8; c++) {
                const p = this.board[r*8 + c];
                if (p) {
                    if (empty) { fen += empty; empty = 0; }
                    let ch = p.type[0];
                    ch = p.color === 'white' ? ch.toUpperCase() : ch;
                    fen += ch;
                } else empty++;
            }
            if (empty) fen += empty;
            if (r < 7) fen += '/';
        }
        fen += ' ' + (this.turn === 'white' ? 'w' : 'b') + ' ';
        let cr = '';
        if (this.castling.wK) cr += 'K';
        if (this.castling.wQ) cr += 'Q';
        if (this.castling.bK) cr += 'k';
        if (this.castling.bQ) cr += 'q';
        fen += (cr || '-') + ' ';
        if (this.epTarget >= 0) {
            fen += String.fromCharCode(97 + (this.epTarget % 8)) + (8 - Math.floor(this.epTarget / 8));
        } else fen += '-';
        fen += ' ' + this.halfMoves + ' ' + this.fullMove;
        return fen;
    }

    isInBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

    isAttackedBy(i, attackerColor) {
        const r = Math.floor(i / 8), c = i % 8;
        const opp = attackerColor;
        const pawnDr = opp === 'white' ? 1 : -1;
        for (const dc of [-1, 1]) {
            const pr = r + pawnDr, pc = c + dc;
            if (this.isInBounds(pr, pc)) {
                const p = this.board[pr*8+pc];
                if (p && p.type === 'pawn' && p.color === opp) return true;
            }
        }
        for (const [dr, dc] of DIR_KNIGHT) {
            const nr = r+dr, nc = c+dc;
            if (this.isInBounds(nr, nc)) {
                const p = this.board[nr*8+nc];
                if (p && p.type === 'knight' && p.color === opp) return true;
            }
        }
        for (const [dr, dc] of DIR_KING) {
            const nr = r+dr, nc = c+dc;
            if (this.isInBounds(nr, nc)) {
                const p = this.board[nr*8+nc];
                if (p && p.type === 'king' && p.color === opp) return true;
            }
        }
        for (let di = 0; di < 8; di++) {
            const [dr, dc] = DIR_SLIDE[di];
            let nr = r+dr, nc = c+dc;
            while (this.isInBounds(nr, nc)) {
                const p = this.board[nr*8+nc];
                if (p) {
                    if (p.color === opp) {
                        const rookOrQueen = (di < 4) && (p.type === 'rook' || p.type === 'queen');
                        const bishopOrQueen = (di >= 4) && (p.type === 'bishop' || p.type === 'queen');
                        if (rookOrQueen || bishopOrQueen) return true;
                    }
                    break;
                }
                nr += dr; nc += dc;
            }
        }
        return false;
    }

    isKingInCheck(color) {
        const ki = color === 'white' ? this.wkIdx : this.bkIdx;
        return ki >= 0 && this.isAttackedBy(ki, color === 'white' ? 'black' : 'white');
    }

    pseudoMoves(fromIdx) {
        const piece = this.board[fromIdx];
        if (!piece) return [];
        const r = Math.floor(fromIdx / 8), c = fromIdx % 8;
        const color = piece.color, opp = color === 'white' ? 'black' : 'white';
        const moves = [];

        const add = (toIdx, extra = {}) => moves.push({ ...extra, toIdx, isCap: !!this.board[toIdx] });

        if (piece.type === 'pawn') {
            const dir = color === 'white' ? -1 : 1;
            const startR = color === 'white' ? 6 : 1;
            const promoR = color === 'white' ? 0 : 7;
            const oneStep = (r + dir) * 8 + c;
            if (this.isInBounds(r+dir, c) && !this.board[oneStep]) {
                add(oneStep, { isPromo: r+dir === promoR });
                const twoStep = (r + 2*dir) * 8 + c;
                if (r === startR && !this.board[twoStep]) add(twoStep, { isDouble: true });
            }
            for (const dc of [-1, 1]) {
                const nc = c + dc;
                if (this.isInBounds(r+dir, nc)) {
                    const ti = (r+dir)*8 + nc;
                    const tgt = this.board[ti];
                    if (tgt && tgt.color === opp) add(ti, { isCap: true, isPromo: r+dir === promoR });
                    if (this.epTarget === ti) add(ti, { isCap: true, isEP: true });
                }
            }
        } else if (piece.type === 'knight') {
            for (const [dr, dc] of DIR_KNIGHT) {
                const nr = r+dr, nc = c+dc;
                if (this.isInBounds(nr, nc)) {
                    const ti = nr*8 + nc;
                    if (!this.board[ti] || this.board[ti].color === opp) add(ti);
                }
            }
        } else if (piece.type === 'king') {
            for (const [dr, dc] of DIR_KING) {
                const nr = r+dr, nc = c+dc;
                if (this.isInBounds(nr, nc)) {
                    const ti = nr*8 + nc;
                    if (!this.board[ti] || this.board[ti].color === opp) add(ti);
                }
            }
            const homeR = color === 'white' ? 7 : 0;
            if (r === homeR && c === 4 && !this.isKingInCheck(color)) {
                const ks = color === 'white' ? 'wK' : 'bK';
                const qs = color === 'white' ? 'wQ' : 'bQ';
                if (this.castling[ks] && !this.board[homeR*8+5] && !this.board[homeR*8+6] &&
                    this.board[homeR*8+7] && this.board[homeR*8+7].type === 'rook' && this.board[homeR*8+7].color === color &&
                    !this.isAttackedBy(homeR*8+4, opp) && !this.isAttackedBy(homeR*8+5, opp) && !this.isAttackedBy(homeR*8+6, opp)) {
                    add(homeR*8+6, { isCastle: true, rookFrom: homeR*8+7, rookTo: homeR*8+5 });
                }
                if (this.castling[qs] && !this.board[homeR*8+1] && !this.board[homeR*8+2] && !this.board[homeR*8+3] &&
                    this.board[homeR*8+0] && this.board[homeR*8+0].type === 'rook' && this.board[homeR*8+0].color === color &&
                    !this.isAttackedBy(homeR*8+4, opp) && !this.isAttackedBy(homeR*8+3, opp) && !this.isAttackedBy(homeR*8+2, opp)) {
                    add(homeR*8+2, { isCastle: true, rookFrom: homeR*8+0, rookTo: homeR*8+3 });
                }
            }
        } else {
            const dirs = piece.type === 'bishop' ? [4,5,6,7] : piece.type === 'rook' ? [0,1,2,3] : [0,1,2,3,4,5,6,7];
            for (const di of dirs) {
                const [dr, dc] = DIR_SLIDE[di];
                let nr = r+dr, nc = c+dc;
                while (this.isInBounds(nr, nc)) {
                    const ti = nr*8 + nc;
                    const tgt = this.board[ti];
                    if (tgt) {
                        if (tgt.color === opp) add(ti);
                        break;
                    }
                    add(ti);
                    nr += dr; nc += dc;
                }
            }
        }
        return moves;
    }

    simulate(fromIdx, move) {
        const piece = this.board[fromIdx];
        const color = piece.color;
        const saved = {};
        const positions = [fromIdx, move.toIdx];
        saved[fromIdx] = this.board[fromIdx];
        saved[move.toIdx] = this.board[move.toIdx];
        if (move.isEP) {
            const epCap = color === 'white' ? move.toIdx + 8 : move.toIdx - 8;
            positions.push(epCap);
            saved[epCap] = this.board[epCap];
            this.board[epCap] = null;
        }
        if (move.isCastle) {
            positions.push(move.rookFrom, move.rookTo);
            saved[move.rookFrom] = this.board[move.rookFrom];
            saved[move.rookTo] = this.board[move.rookTo];
            this.board[move.rookTo] = this.board[move.rookFrom];
            this.board[move.rookFrom] = null;
        }
        this.board[move.toIdx] = piece;
        this.board[fromIdx] = null;
        const oldWk = this.wkIdx, oldBk = this.bkIdx;
        if (piece.type === 'king') {
            if (color === 'white') this.wkIdx = move.toIdx; else this.bkIdx = move.toIdx;
        }
        const inCheck = this.isKingInCheck(color);
        for (const pos of positions) this.board[pos] = saved[pos] ?? null;
        this.wkIdx = oldWk; this.bkIdx = oldBk;
        return !inCheck;
    }

    getLegalMoves(fromIdx) {
        const piece = this.board[fromIdx];
        if (!piece || piece.color !== this.turn) return [];
        return this.pseudoMoves(fromIdx).filter(m => this.simulate(fromIdx, m));
    }

    hasAnyLegal(color) {
        for (let i = 0; i < 64; i++) {
            if (this.board[i] && this.board[i].color === color && this.getLegalMoves(i).length > 0) return true;
        }
        return false;
    }

    makeMove(fromIdx, move, promoType) {
        const piece = this.board[fromIdx];
        const color = piece.color;
        const captured = this.board[move.toIdx];
        if (move.isEP) this.board[color === 'white' ? move.toIdx + 8 : move.toIdx - 8] = null;
        if (move.isCastle) {
            this.board[move.rookTo] = this.board[move.rookFrom];
            this.board[move.rookFrom] = null;
        }
        this.board[move.toIdx] = move.isPromo && promoType ? { type: promoType, color } : piece;
        this.board[fromIdx] = null;
        if (piece.type === 'king') {
            if (color === 'white') this.wkIdx = move.toIdx; else this.bkIdx = move.toIdx;
        }
        if (piece.type === 'rook') {
            if (color === 'white') { if (fromIdx===56) this.castling.wQ=false; if (fromIdx===63) this.castling.wK=false; }
            else { if (fromIdx===0) this.castling.bQ=false; if (fromIdx===7) this.castling.bK=false; }
        }
        if (piece.type === 'king') {
            if (color === 'white') { this.castling.wK = this.castling.wQ = false; }
            else { this.castling.bK = this.castling.bQ = false; }
        }
        if (captured && captured.type === 'rook') {
            if (captured.color === 'white') { if (move.toIdx===56) this.castling.wQ=false; if (move.toIdx===63) this.castling.wK=false; }
            else { if (move.toIdx===0) this.castling.bQ=false; if (move.toIdx===7) this.castling.bK=false; }
        }
        this.epTarget = move.isDouble ? (color === 'white' ? fromIdx - 8 : fromIdx + 8) : -1;
        this.halfMoves = (piece.type === 'pawn' || move.isCap || move.isEP) ? 0 : this.halfMoves + 1;
        if (color === 'black') this.fullMove++;
        this.turn = color === 'white' ? 'black' : 'white';
        this.moveCount++;

        // 走子后验证棋盘合法性
        if (!this.isBoardValid(this.board)) {
            console.error('Invalid board after move, rolling back');
            this.loadFEN(this.lastValidFen);
            return { captured: null, move: null };
        }
        this.lastValidFen = this.getFEN();
        return { captured, move };
    }

    isCheckmate() { return this.isKingInCheck(this.turn) && !this.hasAnyLegal(this.turn); }
    isStalemate() { return !this.isKingInCheck(this.turn) && !this.hasAnyLegal(this.turn); }

    insufficientMaterial() {
        const whitePieces = [];
        const blackPieces = [];
        for (let i = 0; i < 64; i++) {
            const p = this.board[i];
            if (!p) continue;
            if (p.color === 'white') whitePieces.push(p);
            else blackPieces.push(p);
        }
        const total = whitePieces.length + blackPieces.length;
        if (total === 2) return true;
        if (total === 3) {
            const wCount = whitePieces.length, bCount = blackPieces.length;
            if (wCount === 2 && bCount === 1) {
                const nonKing = whitePieces.find(p => p.type !== 'king');
                if (nonKing && (nonKing.type === 'knight' || nonKing.type === 'bishop')) return true;
            }
            if (bCount === 2 && wCount === 1) {
                const nonKing = blackPieces.find(p => p.type !== 'king');
                if (nonKing && (nonKing.type === 'knight' || nonKing.type === 'bishop')) return true;
            }
        }
        if (total === 4 && whitePieces.length === 2 && blackPieces.length === 2) {
            const wBishop = whitePieces.find(p => p.type === 'bishop');
            const bBishop = blackPieces.find(p => p.type === 'bishop');
            if (wBishop && bBishop) {
                const wIdx = this.board.indexOf(wBishop);
                const bIdx = this.board.indexOf(bBishop);
                const wR = Math.floor(wIdx / 8), wC = wIdx % 8;
                const bR = Math.floor(bIdx / 8), bC = bIdx % 8;
                if ((wR + wC) % 2 === (bR + bC) % 2) return true;
            }
        }
        return false;
    }

    getGameStatus() {
        if (this.isCheckmate()) return { over: true, result: this.turn === 'white' ? 'black' : 'white' };
        if (this.isStalemate()) return { over: true, result: 'draw' };
        if (this.halfMoves >= 100) return { over: true, result: 'draw' };
        if (this.insufficientMaterial()) return { over: true, result: 'draw' };
        return { over: false };
    }
}

window.ChessEngine = ChessEngine;