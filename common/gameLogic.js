// --- Shared Game Logic ---
(function(exports) {

    // --- CONSTANTS ---
    const ROWS = 12;
    const COLS = 5;
    const PLAYERS = { RED: 'red', BLACK: 'black' };
    const PIECE_TYPES = {
        'flag': { rank: 0, name: '軍旗' }, 'landmine': { rank: 1, name: '地雷' },
        'bomb': { rank: 2, name: '炸彈' }, 'engineer': { rank: 3, name: '工兵' },
        'lieutenant': { rank: 4, name: '排長' }, 'captain': { rank: 5, name: '連長' },
        'major': { rank: 6, name: '營長' }, 'colonel': { rank: 7, name: '團長' },
        'brigadier': { rank: 8, name: '旅長' }, 'major_general': { rank: 9, name: '師長' },
        'general': { rank: 10, name: '軍長' }, 'field_marshal': { rank: 11, name: '司令' },
    };
    const PIECE_COUNTS = {
        'flag': 1, 'landmine': 3, 'bomb': 2, 'engineer': 3, 'lieutenant': 3,
        'captain': 3, 'major': 2, 'colonel': 2, 'brigadier': 2,
        'major_general': 1, 'general': 1, 'field_marshal': 1
    };
    const DEFAULT_AI_WEIGHTS = {
        pieceValue: 10,         // Base value per rank
        revealedPenalty: 3,     // Penalty for each unknown enemy piece
        positionalBonus: 1,     // Bonus for advancing rows
        threatPenalty: 50,      // Penalty if a high-value piece is threatened
        opportunityBonus: 40,   // Bonus for creating a threat on a high-value piece
        engineerVsMineBonus: 60,// Bonus for engineer attacking a mine
        bombVsHighValueBonus: 70// Bonus for bomb attacking a high-value piece
    };

    // --- FUNCTION DEFINITIONS ---

    function shuffle(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }
    function createPlayerPieces(player) {
        const pieces = [];
        for (const type in PIECE_COUNTS) {
            for (let i = 0; i < PIECE_COUNTS[type]; i++) {
                pieces.push({ type, ...PIECE_TYPES[type], player, revealed: false });
            }
        }
        return pieces;
    }

    function placePlayerPieces(board, player, zone) {
        let allPieces = createPlayerPieces(player);
        const allPlayerCells = [];
        for (let r = zone.startRow; r <= zone.endRow; r++) for (let c = 0; c < COLS; c++) allPlayerCells.push({ r, c });
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
            if (cell) board[cell.r][cell.c] = piece;
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
            const newRow = row + dir.r, newCol = col + dir.c;
            if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
                const targetPiece = board[newRow][newCol];
                if (!targetPiece || targetPiece.player !== piece.player) moves.push({ r: newRow, c: newCol });
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
                    validMoves.forEach(move => allMoves.push({ from: { r, c }, to: { r: move.r, c: move.c }, piece }));
                }
            }
        }
        return allMoves;
    }

    function applySimulatedMove(board, move) {
        const newBoard = JSON.parse(JSON.stringify(board));
        const attacker = newBoard[move.from.r][move.from.c];
        const defender = newBoard[move.to.r][move.to.c];
        if (defender) {
            const combatResult = simulateCombat(attacker, defender);
            attacker.revealed = true; if(defender) defender.revealed = true;
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

    // --- AI EVALUATION AND EXECUTION ---

    function evaluateBoard(board, player, weights) {
        let score = 0;
        const opponent = (player === PLAYERS.RED) ? PLAYERS.BLACK : PLAYERS.RED;
        const highValuePieceRanks = [PIECE_TYPES.field_marshal.rank, PIECE_TYPES.general.rank, PIECE_TYPES.major_general.rank];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                // 1. Basic Piece and Position Score
                let pieceScore = piece.rank * weights.pieceValue;
                if (player === PLAYERS.BLACK) { // Black moves down
                    pieceScore += r * weights.positionalBonus;
                } else { // Red moves up
                    pieceScore += (ROWS - 1 - r) * weights.positionalBonus;
                }

                if (piece.player === player) {
                    score += pieceScore;
                } else {
                    if (piece.revealed) {
                        score -= pieceScore;
                    } else {
                        score -= weights.revealedPenalty;
                    }
                }

                // 2. Threat & Opportunity Assessment (only if piece has neighbors)
                const directions = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
                for (const dir of directions) {
                    const adjR = r + dir.r;
                    const adjC = c + dir.c;

                    if (adjR >= 0 && adjR < ROWS && adjC >= 0 && adjC < COLS) {
                        const otherPiece = board[adjR][adjC];
                        if (!otherPiece || otherPiece.player === piece.player) continue;

                        const combatResult = simulateCombat(piece, otherPiece);

                        if (piece.player === player) { // My piece is looking at an enemy
                            if (otherPiece.revealed) {
                                if (combatResult.winner === 'attacker') {
                                    // Special Opportunity Bonuses
                                    if (piece.type === 'engineer' && otherPiece.type === 'landmine') {
                                        score += weights.engineerVsMineBonus;
                                    } else if (piece.type === 'bomb' && highValuePieceRanks.includes(otherPiece.rank)) {
                                        score += weights.bombVsHighValueBonus;
                                    } else {
                                        score += weights.opportunityBonus + (otherPiece.rank * weights.pieceValue / 2);
                                    }
                                }
                            }
                        } else { // An enemy piece is looking at my piece
                            if (otherPiece.revealed && piece.revealed) { // Enemy is revealed and my piece is revealed
                                if (combatResult.winner === 'defender') { // The enemy would win
                                    if (highValuePieceRanks.includes(otherPiece.rank)) {
                                        score -= weights.threatPenalty;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return score;
    }

    function executeEasyAITurn(board, player) {
        const allMoves = getAllMovesForPlayer(board, player);
        if (allMoves.length === 0) return { bestMove: null, moveScores: [] };
        const attackingMoves = allMoves.filter(move => board[move.to.r][move.to.c] !== null);
        const nonAttackingMoves = allMoves.filter(move => board[move.to.r][move.to.c] === null);
        let chosenMove;
        if (attackingMoves.length > 0) {
            chosenMove = attackingMoves[Math.floor(Math.random() * attackingMoves.length)];
        } else {
            chosenMove = nonAttackingMoves[Math.floor(Math.random() * nonAttackingMoves.length)];
        }
        return { bestMove: chosenMove, moveScores: [{ move: chosenMove, score: 1 }] };
    }

    function executeNormalAITurn(board, player, opponent, weights = DEFAULT_AI_WEIGHTS) {
        const allMoves = getAllMovesForPlayer(board, player);
        if (allMoves.length === 0) return { bestMove: null, moveScores: [] };

        const moveScores = allMoves.map(move => {
            const newBoard = applySimulatedMove(board, move);
            const score = evaluateBoard(newBoard, player, weights);
            return { move, score };
        });

        moveScores.sort((a, b) => b.score - a.score);
        const bestScore = moveScores[0].score;
        const bestMoves = moveScores.filter(ms => ms.score === bestScore);
        const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)].move;

        return { bestMove: chosenMove, moveScores };
    }

    function minimax(board, depth, maximizingPlayer, isMaximizing, alpha, beta, weights) {
        if (depth === 0) return evaluateBoard(board, maximizingPlayer, weights);
        const currentPlayer = isMaximizing ? maximizingPlayer : (maximizingPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED);
        const allMoves = getAllMovesForPlayer(board, currentPlayer);
        if (allMoves.length === 0) return evaluateBoard(board, maximizingPlayer, weights);
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of allMoves) {
                const newBoard = applySimulatedMove(board, move);
                const evaluation = minimax(newBoard, depth - 1, maximizingPlayer, false, alpha, beta, weights);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = +Infinity;
            for (const move of allMoves) {
                const newBoard = applySimulatedMove(board, move);
                const evaluation = minimax(newBoard, depth - 1, maximizingPlayer, true, alpha, beta, weights);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    function executeHardAITurn(board, player, weights = DEFAULT_AI_WEIGHTS) {
        const allMoves = getAllMovesForPlayer(board, player);
        if (allMoves.length === 0) return { bestMove: null, moveScores: [] };
        const depth = 2;
        const moveScores = [];
        for (const move of allMoves) {
            const newBoard = applySimulatedMove(board, move);
            const score = minimax(newBoard, depth - 1, player, false, -Infinity, +Infinity, weights);
            moveScores.push({ move, score });
        }
        moveScores.sort((a, b) => b.score - a.score);
        const bestScore = moveScores[0].score;
        const bestMoves = moveScores.filter(ms => ms.score === bestScore);
        const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)].move;
        return { bestMove: chosenMove, moveScores };
    }

    // --- EXPORTS ---
    exports.ROWS = ROWS;
    exports.COLS = COLS;
    exports.PLAYERS = PLAYERS;
    exports.PIECE_TYPES = PIECE_TYPES;
    exports.DEFAULT_AI_WEIGHTS = DEFAULT_AI_WEIGHTS;
    exports.initBoard = initBoard;
    exports.getValidMoves = getValidMoves;
    exports.simulateCombat = simulateCombat;
    exports.getAllMovesForPlayer = getAllMovesForPlayer;
    exports.applySimulatedMove = applySimulatedMove;
    exports.evaluateBoard = evaluateBoard;
    exports.minimax = minimax;
    exports.executeEasyAITurn = executeEasyAITurn;
    exports.executeNormalAITurn = executeNormalAITurn;
    exports.executeHardAITurn = executeHardAITurn;

}(typeof exports === 'undefined' ? this.GameLogic = {} : exports));