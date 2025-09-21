document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameModeSelection = document.getElementById('game-mode-selection');
    const mainGameScreen = document.getElementById('main-game-screen');
    const pvpButton = document.getElementById('pvp-button');
    const pvaiButton = document.getElementById('pvai-button');
    const boardContainer = document.getElementById('board-container');
    const gameStatusArea = document.querySelector('#game-status-area p');
    const newGameButton = document.getElementById('new-game-button');

    // --- Game Constants ---
    const ROWS = 12;
    const COLS = 5;
    const PLAYERS = { RED: 'red', BLACK: 'black' };
    const HUMAN_PLAYER = PLAYERS.RED;
    const AI_PLAYER = PLAYERS.BLACK;
    const BOARD_SPEC = {
        camps: [[1,1], [1,3], [2,2], [3,1], [3,3], [7,1], [7,3], [8,2], [9,1], [9,3]],
        hqs: [[0,1], [0,3], [11,1], [11,3]],
        railroads: [],
    };
    function generateRailroadSpec() {
        const railroadSet = new Set();
        for (let c = 0; c < COLS; c++) { [0, 5, 6, 11].forEach(r => railroadSet.add(`${r},${c}`)); }
        for (let r = 0; r < ROWS; r++) { [0, 4].forEach(c => railroadSet.add(`${r},${c}`)); }
        for (let r = 1; r <= 4; r++) railroadSet.add(`${r},2`);
        for (let r = 7; r <= 10; r++) railroadSet.add(`${r},2`);
        [[1,1],[1,3],[4,1],[4,3], [7,1],[7,3],[10,1],[10,3]].forEach(p => railroadSet.add(`${p[0]},${p[1]}`));
        BOARD_SPEC.railroads = Array.from(railroadSet).map(s => { const [r, c] = s.split(','); return {r: parseInt(r), c: parseInt(c)}; });
    }
    generateRailroadSpec();
    const PIECE_SETUP = [
        { type: 'commander', count: 1 }, { type: 'army_commander', count: 1 },
        { type: 'division_commander', count: 2 }, { type: 'brigade_commander', count: 2 },
        { type: 'regiment_commander', count: 2 }, { type: 'battalion_commander', count: 2 },
        { type: 'company_commander', count: 3 }, { type: 'platoon_leader', count: 3 },
        { type: 'engineer', count: 3 }, { type: 'bomb', count: 2 },
        { type: 'landmine', count: 3 }, { type: 'flag', count: 1 }
    ];
    const PIECE_DATA = {
        'flag': { rank: 0, name: '軍旗' }, 'landmine': { rank: 1, name: '地雷' },
        'bomb': { rank: 2, name: '炸彈' }, 'engineer': { rank: 3, name: '工兵' },
        'platoon_leader': { rank: 4, name: '排長' }, 'company_commander': { rank: 5, name: '連長' },
        'battalion_commander': { rank: 6, name: '營長' }, 'regiment_commander': { rank: 7, name: '團長' },
        'brigade_commander': { rank: 8, name: '旅長' }, 'division_commander': { rank: 9, name: '師長' },
        'army_commander': { rank: 10, name: '軍長' }, 'commander': { rank: 11, name: '司令' }
    };

    // --- Game State ---
    let gameState = {};
    let selectedPieceInfo = null;

    // --- Helper Functions ---
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Setup Functions ---
    function createInitialPieces(player) {
        const pieceSet = [];
        PIECE_SETUP.forEach(({ type, count }) => {
            for (let i = 0; i < count; i++) {
                pieceSet.push({
                    id: `${player}-${type}-${i}`, type: type, player: player,
                    ...PIECE_DATA[type], revealed: false,
                    position: {r: -1, c: -1}
                });
            }
        });
        return pieceSet;
    }
    function getPlayerPlacementInfo(player) {
        const startRow = player === PLAYERS.RED ? 6 : 0;
        const info = {
            camp: [[startRow + 1, 1], [startRow + 1, 3], [startRow + 3, 1], [startRow + 3, 3], [startRow + 2, 2]],
            hq: [[startRow + 5, 1], [startRow + 5, 3]],
            backRows: [startRow + 4, startRow + 5],
            frontRow: startRow
        };
        let positions = [];
        for(let r = 0; r < 6; r++){
            for(let c = 0; c < 5; c++){
                const pos = [startRow + r, c];
                if(!info.camp.some(campPos => campPos[0] === pos[0] && campPos[1] === pos[1])) {
                    positions.push(pos);
                }
            }
        }
        info.positions = positions;
        return info;
    }

    function placePiecesForPlayer(player) {
        let piecesToPlace = createInitialPieces(player);
        let placementInfo = getPlayerPlacementInfo(player);
        let availablePositions = [...placementInfo.positions];
        shuffleArray(availablePositions);

        const placePieceType = (type, count, validator) => {
            for (let i = 0; i < count; i++) {
                const pieceIndex = piecesToPlace.findIndex(p => p.type === type);
                const piece = piecesToPlace.splice(pieceIndex, 1)[0];
                let placed = false;
                for (let j = 0; j < availablePositions.length; j++) {
                    const pos = availablePositions[j];
                    if (validator(pos)) {
                        piece.position = { r: pos[0], c: pos[1] };
                        gameState.board[pos[0]][pos[1]] = piece;
                        availablePositions.splice(j, 1);
                        placed = true;
                        break;
                    }
                }
            }
        };

        // Place constrained pieces first
        placePieceType('flag', 1, (pos) => placementInfo.hq.some(p => p[0] === pos[0] && p[1] === pos[1]));
        placePieceType('landmine', 3, (pos) => placementInfo.backRows.includes(pos[0]));
        placePieceType('bomb', 2, (pos) => pos[0] !== placementInfo.frontRow);

        // Place the rest of the pieces in the remaining positions
        shuffleArray(piecesToPlace);
        piecesToPlace.forEach(piece => {
            if (availablePositions.length > 0) {
                const pos = availablePositions.pop();
                piece.position = { r: pos[0], c: pos[1] };
                gameState.board[pos[0]][pos[1]] = piece;
            }
        });
    }

    function initializeLayout() {
        placePiecesForPlayer(PLAYERS.RED);
        placePiecesForPlayer(PLAYERS.BLACK);
    }

    // --- Gameplay Functions ---
    function isRailroad(pos) { return BOARD_SPEC.railroads.some(p => p.r === pos.r && p.c === pos.c); }
    function isCamp(pos) { return BOARD_SPEC.camps.some(p => p.r === pos.r && p.c === pos.c); }
    function isHq(pos) { return BOARD_SPEC.hqs.some(p => p.r === pos.r && p.c === pos.c); }

    function isValidMove(startPos, endPos) {
        const piece = gameState.board[startPos.r][startPos.c];
        if (!piece || piece.type === 'flag' || piece.type === 'landmine') return false;
        if (isHq(startPos)) return false;

        const targetPiece = gameState.board[endPos.r][endPos.c];
        if (targetPiece && targetPiece.player === piece.player) return false;
        if (targetPiece && isCamp(endPos)) return false;
        if (piece.type !== 'flag' && isHq(endPos)) return false;

        const dr = endPos.r - startPos.r;
        const dc = endPos.c - startPos.c;
        const distance = Math.abs(dr) + Math.abs(dc);
        if (distance === 1) return true;

        if (isRailroad(startPos) && isRailroad(endPos)) {
            if (startPos.r === endPos.r || startPos.c === endPos.c) {
                const stepR = Math.sign(dr);
                const stepC = Math.sign(dc);
                let pathIsClear = true;
                for (let i = 1; i < distance; i++) {
                    if (gameState.board[startPos.r + i * stepR][startPos.c + i * stepC]) {
                        pathIsClear = false;
                        break;
                    }
                }
                if (pathIsClear) {
                    if (piece.type === 'engineer') return true;
                    if (distance <= 3) return true;
                }
            }
        }
        return false;
    }

    function determineBattle(attacker, defender) {
        attacker.revealed = true;
        defender.revealed = true;
        if (defender.type === 'flag') {
            return gameState.commanderLost[attacker.player] ? { isDraw: true, isGameOver: true } : { winner: attacker, loser: defender, isGameOver: true };
        }
        if (attacker.type === 'bomb' || defender.type === 'bomb') return { isTie: true };
        if (defender.type === 'landmine') {
            return attacker.type === 'engineer' ? { winner: attacker, loser: defender } : { winner: defender, loser: attacker };
        }
        if (attacker.rank === defender.rank) return { isTie: true };
        return attacker.rank > defender.rank ? { winner: attacker, loser: defender } : { winner: defender, loser: attacker };
    }

    function revealFlag(player) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = gameState.board[r][c];
                if (piece && piece.player === player && piece.type === 'flag') {
                    piece.revealed = true; return;
                }
            }
        }
    }

    function handleMove(startPos, endPos) {
        const attacker = gameState.board[startPos.r][startPos.c];
        const defender = gameState.board[endPos.r][endPos.c];
        attacker.position = endPos;
        gameState.board[startPos.r][startPos.c] = null;
        if (defender) {
            const result = determineBattle(attacker, defender);
            if (result.isGameOver) {
                endGame(result.isDraw ? null : result.winner.player);
                if (!result.isDraw) gameState.board[endPos.r][endPos.c] = result.winner;
                renderBoard(); return;
            } else if (result.isTie) {
                gameState.board[endPos.r][endPos.c] = null;
                if (attacker.type === 'commander') { gameState.commanderLost[attacker.player] = true; revealFlag(attacker.player); }
                if (defender.type === 'commander') { gameState.commanderLost[defender.player] = true; revealFlag(defender.player); }
            } else if (result.winner === attacker) {
                gameState.board[endPos.r][endPos.c] = attacker;
                if (result.loser.type === 'commander') { gameState.commanderLost[result.loser.player] = true; revealFlag(result.loser.player); }
            } else {
                gameState.board[endPos.r][endPos.c] = defender;
                 if (result.loser.type === 'commander') { gameState.commanderLost[result.loser.player] = true; revealFlag(result.loser.player); }
            }
        } else {
            gameState.board[endPos.r][endPos.c] = attacker;
        }
        switchPlayer();
    }

    function hasLegalMoves(player) {
        for (let r1 = 0; r1 < ROWS; r1++) {
            for (let c1 = 0; c1 < COLS; c1++) {
                const piece = gameState.board[r1][c1];
                if (piece && piece.player === player) {
                    const startPos = { r: r1, c: c1 };
                    for (let r2 = 0; r2 < ROWS; r2++) {
                        for (let c2 = 0; c2 < COLS; c2++) {
                            if (r1 === r2 && c1 === c2) continue;
                            if (isValidMove(startPos, { r: r2, c: c2 })) return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    function switchPlayer() {
        if (gameState.isGameOver) return;
        gameState.currentPlayer = gameState.currentPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
        updateStatus(`輪到 ${gameState.currentPlayer === 'red' ? '紅方' : '黑方'} 行動`);
        renderBoard();
        if (!hasLegalMoves(gameState.currentPlayer)) {
            const winner = gameState.currentPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
            endGame(winner); return;
        }
        if (gameState.gameMode === 'pvai' && gameState.currentPlayer === AI_PLAYER) {
            setTimeout(triggerAIMove, 1000);
        }
    }

    function triggerAIMove() {
        if (gameState.isGameOver) return;
        const attackMoves = [], passiveMoves = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = gameState.board[r][c];
                if (piece && piece.player === AI_PLAYER) {
                    const startPos = { r, c };
                    for (let r2 = 0; r2 < ROWS; r2++) {
                        for (let c2 = 0; c2 < COLS; c2++) {
                            if (r === r2 && c === c2) continue;
                            const endPos = { r: r2, c: c2 };
                            if (isValidMove(startPos, endPos)) {
                                const move = { startPos, endPos };
                                const target = gameState.board[endPos.r][endPos.c];
                                if (target && target.player !== AI_PLAYER) attackMoves.push(move);
                                else passiveMoves.push(move);
                            }
                        }
                    }
                }
            }
        }
        let chosenMove = null;
        if (attackMoves.length > 0) chosenMove = attackMoves[Math.floor(Math.random() * attackMoves.length)];
        else if (passiveMoves.length > 0) chosenMove = passiveMoves[Math.floor(Math.random() * passiveMoves.length)];
        if (chosenMove) handleMove(chosenMove.startPos, chosenMove.endPos);
    }

    function handleBoardClick(event) {
        if (gameState.isGameOver || (gameState.gameMode === 'pvai' && gameState.currentPlayer === AI_PLAYER)) return;
        const cell = event.target.closest('.cell');
        if (!cell) return;
        const r = parseInt(cell.dataset.row), c = parseInt(cell.dataset.col);
        if (selectedPieceInfo) {
            const startPos = selectedPieceInfo.piece.position;
            const endPos = { r, c };
            if (isValidMove(startPos, endPos)) {
                handleMove(startPos, endPos);
            }
            selectedPieceInfo = null;
            renderBoard();
        } else {
            const pieceData = gameState.board[r][c];
            if (pieceData && pieceData.player === gameState.currentPlayer) {
                selectedPieceInfo = { piece: pieceData, domElement: cell.querySelector('.piece') };
                renderBoard();
            }
        }
    }

    function updateStatus(message) { gameStatusArea.textContent = message; }

    function renderBoard() {
        boardContainer.innerHTML = '';
        const selectedId = selectedPieceInfo ? selectedPieceInfo.piece.id : null;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                const pieceData = gameState.board[r][c];
                if (pieceData) {
                    const pieceEl = document.createElement('div');
                    pieceEl.classList.add('piece', `piece-${pieceData.player}`);
                    pieceEl.dataset.pieceId = pieceData.id;
                    const canSee = pieceData.player === HUMAN_PLAYER || pieceData.revealed;
                    if (canSee) {
                        pieceEl.textContent = pieceData.name;
                        if(pieceData.type === 'flag' && pieceData.revealed) pieceEl.classList.add('revealed-flag');
                    } else {
                        pieceEl.textContent = '棋';
                        pieceEl.classList.add('unrevealed');
                    }
                    if(pieceData.id === selectedId) pieceEl.classList.add('selected');
                    cell.appendChild(pieceEl);
                }
                boardContainer.appendChild(cell);
            }
        }
    }
    function endGame(winner) {
        gameState.isGameOver = true;
        if (winner) {
            const winnerName = winner === 'red' ? '紅方' : '黑方';
            updateStatus(`遊戲結束！${winnerName}獲勝！`);
        } else {
            updateStatus(`遊戲結束！雙方平局！`);
        }
    }
    function startGame(mode) {
        gameState = {
            gameMode: mode,
            currentPlayer: PLAYERS.RED,
            board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)),
            capturedPieces: { [PLAYERS.RED]: [], [PLAYERS.BLACK]: [] },
            commanderLost: { [PLAYERS.RED]: false, [PLAYERS.BLACK]: false },
            isGameOver: false,
        };
        selectedPieceInfo = null;
        gameModeSelection.style.display = 'none';
        mainGameScreen.style.display = 'block';
        updateStatus(`輪到 ${gameState.currentPlayer === 'red' ? '紅方' : '黑方'} 行動`);
        initializeLayout();
        renderBoard();
    }

    // --- Event Listeners ---
    pvpButton.addEventListener('click', () => startGame('pvp'));
    pvaiButton.addEventListener('click', () => startGame('pvai'));
    newGameButton.addEventListener('click', () => {
        mainGameScreen.style.display = 'none';
        gameModeSelection.style.display = 'block';
    });
    boardContainer.addEventListener('click', handleBoardClick);
});
