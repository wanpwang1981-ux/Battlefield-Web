// --- Shared Game Logic ---
// This file contains game logic that can be shared between the frontend and a potential backend.
// It does not depend on the DOM or any browser-specific APIs.
(function(exports) {

    const ROWS = 12;
    const COLS = 5;
    const PLAYERS = { RED: 'red', BLACK: 'black' };

    const PIECE_TYPES = {
        'flag': { rank: 0, name: '軍旗', count: 1 },
        'landmine': { rank: 1, name: '地雷', count: 3 },
        'bomb': { rank: 2, name: '炸彈', count: 2 },
        'engineer': { rank: 3, name: '工兵', count: 3 },
        'lieutenant': { rank: 4, name: '排長', count: 3 },
        'captain': { rank: 5, name: '連長', count: 3 },
        'major': { rank: 6, name: '營長', count: 2 },
        'colonel': { rank: 7, name: '團長', count: 2 },
        'brigadier': { rank: 8, name: '旅長', count: 2 },
        'major_general': { rank: 9, name: '師長', count: 1 },
        'general': { rank: 10, name: '軍長', count: 1 },
        'field_marshal': { rank: 11, name: '司令', count: 1 },
    };

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function createPlayerPieces(player) {
        const pieces = [];
        for (const type in PIECE_TYPES) {
            for (let i = 0; i < PIECE_TYPES[type].count; i++) {
                pieces.push({ type, rank: PIECE_TYPES[type].rank, name: PIECE_TYPES[type].name, player, revealed: false });
            }
        }
        return pieces;
    }

    function placePlayerPieces(board, player, zone) {
        let allPieces = createPlayerPieces(player);
        const allPlayerCells = [];
        for (let r = zone.startRow; r <= zone.endRow; r++) {
            for (let c = 0; c < COLS; c++) {
                allPlayerCells.push({ r, c });
            }
        }
        const placeRestrictedPieces = (piecesToPlace, validCells) => {
            shuffle(validCells);
            piecesToPlace.forEach(piece => {
                const cell = validCells.pop();
                if (cell) {
                    board[cell.r][cell.c] = piece;
                    const indexInAll = allPlayerCells.findIndex(c => c.r === cell.r && c.c === cell.c);
                    if (indexInAll !== -1) allPlayerCells.splice(indexInAll, 1);
                }
            });
        };
        const flag = allPieces.find(p => p.type === 'flag');
        allPieces = allPieces.filter(p => p.type !== 'flag');
        const headquartersCells = allPlayerCells.filter(c => (c.r === zone.endRow && (c.c === 1 || c.c === 3)));
        placeRestrictedPieces([flag], headquartersCells);
        const landmines = allPieces.filter(p => p.type === 'landmine');
        allPieces = allPieces.filter(p => p.type !== 'landmine');
        const lastTwoRowsCells = allPlayerCells.filter(c => c.r >= zone.endRow - 1);
        placeRestrictedPieces(landmines, lastTwoRowsCells);
        const bombs = allPieces.filter(p => p.type === 'bomb');
        allPieces = allPieces.filter(p => p.type !== 'bomb');
        const notFirstRowCells = allPlayerCells.filter(c => c.r !== zone.startRow);
        placeRestrictedPieces(bombs, notFirstRowCells);
        shuffle(allPieces);
        shuffle(allPlayerCells);
        allPieces.forEach(piece => {
            const cell = allPlayerCells.pop();
            if (cell) {
                board[cell.r][cell.c] = piece;
            }
        });
    }

    function initBoard() {
        const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        const redZone = { startRow: 6, endRow: 11 };
        const blackZone = { startRow: 0, endRow: 5 };
        placePlayerPieces(board, PLAYERS.RED, redZone);
        for (let r = redZone.startRow; r <= redZone.endRow; r++) {
            for (let c = 0; c < COLS; c++) {
                const redPiece = board[r][c];
                if (redPiece) {
                    const blackPiece = { ...redPiece, player: PLAYERS.BLACK };
                    const mirrorRow = blackZone.startRow + (redZone.endRow - r);
                    const mirrorCol = (COLS - 1) - c;
                    board[mirrorRow][mirrorCol] = blackPiece;
                }
            }
        }
        return board;
    }

    function getValidMoves(board, row, col) {
        const moves = [];
        const piece = board[row][col];
        if (!piece) return [];
        const directions = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
        for (const dir of directions) {
            const newRow = row + dir.r;
            const newCol = col + dir.c;
            if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
                const targetPiece = board[newRow][newCol];
                if (!targetPiece || targetPiece.player !== piece.player) {
                    moves.push({ r: newRow, c: newCol });
                }
            }
        }
        return moves;
    }

    function simulateCombat(attacker, defender) {
        if (!attacker || !defender) return { winner: attacker ? 'attacker' : 'defender' };
        if (attacker.type === 'bomb' || defender.type === 'bomb') return { winner: 'tie' };
        if (defender.type === 'flag') return { winner: 'attacker' };
        if (defender.type === 'landmine') return attacker.type === 'engineer' ? { winner: 'attacker' } : { winner: 'defender' };
        if (Number(attacker.rank) > Number(defender.rank)) return { winner: 'attacker' };
        if (Number(attacker.rank) < Number(defender.rank)) return { winner: 'defender' };
        return { winner: 'tie' };
    }

    function getAllMovesForPlayer(board, player) {
        const allMoves = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = board[r][c];
                if (piece && piece.player === player && piece.type !== 'flag' && piece.type !== 'landmine') {
                    const validMoves = getValidMoves(board, r, c);
                    validMoves.forEach(move => {
                         allMoves.push({ from: { r, c }, to: { r: move.r, c: move.c }, piece });
                    });
                }
            }
        }
        return allMoves;
    }

    function getMoveScore(board, move) {
        const attacker = move.piece;
        const defender = board[move.to.r][move.to.c];
        if (defender) {
            if (!defender.revealed) return 5 - attacker.rank;
            const combatResult = simulateCombat(attacker, defender);
            if (combatResult.winner === 'attacker') return 100 + (defender.rank * 10);
            else if (combatResult.winner === 'tie') return 50 - attacker.rank;
            else return -100 - attacker.rank;
        }
        let score = 0;
        if (attacker.player === PLAYERS.BLACK) score += (move.to.r - move.from.r);
        else score += (move.from.r - move.to.r);
        return score;
    }

    function applySimulatedMove(board, move) {
        const newBoard = JSON.parse(JSON.stringify(board));
        const attacker = newBoard[move.from.r][move.from.c];
        const defender = newBoard[move.to.r][move.to.c];
        if (defender) {
            const combatResult = simulateCombat(attacker, defender);
            attacker.revealed = true; defender.revealed = true;
            newBoard[move.from.r][move.from.c] = null;
            if (combatResult.winner === 'attacker') newBoard[move.to.r][move.to.c] = attacker;
            else if (combatResult.winner === 'defender') {}
            else newBoard[move.to.r][move.to.c] = null;
        } else {
            newBoard[move.to.r][move.to.c] = attacker;
            newBoard[move.from.r][move.from.c] = null;
        }
        return newBoard;
    }

    function executeEasyAITurn(board, player) {
        const allMoves = getAllMovesForPlayer(board, player);
        if (allMoves.length === 0) return null;
        const attackingMoves = allMoves.filter(move => board[move.to.r][move.to.c] !== null);
        const nonAttackingMoves = allMoves.filter(move => board[move.to.r][move.to.c] === null);
        if (attackingMoves.length > 0) return attackingMoves[Math.floor(Math.random() * attackingMoves.length)];
        return nonAttackingMoves[Math.floor(Math.random() * nonAttackingMoves.length)];
    }

    function executeNormalAITurn(board, player, opponent) {
        const highValuePieces = ['field_marshal', 'general', 'major_general', 'brigadier'];
        const myPieces = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c] && board[r][c].player === player) myPieces.push({ piece: board[r][c], r, c });
        for (const myPiece of myPieces) {
            if (!highValuePieces.includes(myPiece.piece.type)) continue;
            const directions = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
            for (const dir of directions) {
                const enemyR = myPiece.r + dir.r, enemyC = myPiece.c + dir.c;
                if (enemyR >= 0 && enemyR < ROWS && enemyC >= 0 && enemyC < COLS) {
                    const enemyPiece = board[enemyR][enemyC];
                    if (enemyPiece && enemyPiece.player === opponent && enemyPiece.revealed) {
                        if (simulateCombat(enemyPiece, myPiece.piece).winner === 'attacker') {
                            const escapeMoves = getValidMoves(board, myPiece.r, myPiece.c).filter(move => !board[move.r][move.c]);
                            if (escapeMoves.length > 0) return { from: { r: myPiece.r, c: myPiece.c }, to: escapeMoves[Math.floor(Math.random() * escapeMoves.length)], piece: myPiece.piece, isDefensive: true };
                        }
                    }
                }
            }
        }
        const allMoves = getAllMovesForPlayer(board, player);
        if (allMoves.length === 0) return null;
        let bestScore = -Infinity, bestMoves = [];
        allMoves.forEach(move => {
            const score = getMoveScore(board, move);
            if (score > bestScore) { bestScore = score; bestMoves = [move]; }
            else if (score === bestScore) { bestMoves.push(move); }
        });
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    function evaluateBoard(board, player) {
        let score = 0;
        const opponent = (player === PLAYERS.RED) ? PLAYERS.BLACK : PLAYERS.RED;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = board[r][c];
                if (piece) {
                    const pieceScore = piece.rank * piece.rank;
                    if (piece.player === player) score += pieceScore;
                    else if (piece.player === opponent && piece.revealed) score -= pieceScore;
                }
            }
        }
        return score;
    }

    function minimax(board, depth, maximizingPlayer, isMaximizing, alpha, beta) {
        if (depth === 0) return evaluateBoard(board, maximizingPlayer);
        const currentPlayer = isMaximizing ? maximizingPlayer : (maximizingPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED);
        const allMoves = getAllMovesForPlayer(board, currentPlayer);
        if (allMoves.length === 0) return evaluateBoard(board, maximizingPlayer);
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of allMoves) {
                const newBoard = applySimulatedMove(board, move);
                const evaluation = minimax(newBoard, depth - 1, maximizingPlayer, false, alpha, beta);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = +Infinity;
            for (const move of allMoves) {
                const newBoard = applySimulatedMove(board, move);
                const evaluation = minimax(newBoard, depth - 1, maximizingPlayer, true, alpha, beta);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    function executeHardAITurn(board, player) {
        const allMoves = getAllMovesForPlayer(board, player);
        if (allMoves.length === 0) return null;
        let bestScore = -Infinity, bestMoves = [];
        const depth = 2;
        for (const move of allMoves) {
            const newBoard = applySimulatedMove(board, move);
            const score = minimax(newBoard, depth - 1, player, false, -Infinity, +Infinity);
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // Export for both browser (window.GameLogic) and Node.js (module.exports)
    exports.ROWS = ROWS;
    exports.COLS = COLS;
    exports.PLAYERS = PLAYERS;
    exports.PIECE_TYPES = PIECE_TYPES;
    exports.initBoard = initBoard;
    exports.getValidMoves = getValidMoves;
    exports.simulateCombat = simulateCombat;
    exports.executeEasyAITurn = executeEasyAITurn;
    exports.executeNormalAITurn = executeNormalAITurn;
    exports.executeHardAITurn = executeHardAITurn;

}(typeof exports === 'undefined' ? this.GameLogic = {} : exports));
