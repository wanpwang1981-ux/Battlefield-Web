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
    /**
     * Shuffles an array in place using the Fisher-Yates (aka Knuth) shuffle.
     * @param {Array} array The array to shuffle.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
    }

    // --- Setup Functions ---
    function createInitialPieces(player) {
        const pieceSet = [];
        PIECE_SETUP.forEach(({ type, count }) => {
            for (let i = 0; i < count; i++) {
                pieceSet.push({
                    id: `${player}-${type}-${i}`, type: type, player: player,
                    ...PIECE_DATA[type], revealed: true, // Revealed for debugging
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
            backRows: [startRow + 4, startRow + 5], frontRow: startRow
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
        let pieces = createInitialPieces(player);
        let placementInfo = getPlayerPlacementInfo(player);
        let availablePositions = [...placementInfo.positions];

        // Shuffle all available positions once at the beginning for true randomness
        shuffleArray(availablePositions);

        const placePiece = (pieceType) => {
            const pieceIndex = pieces.findIndex(p => p.type === pieceType);
            const piece = pieces.splice(pieceIndex, 1)[0];
            let placed = false;

            // Find a valid position from the shuffled list
            for (let i = 0; i < availablePositions.length; i++) {
                const pos = availablePositions[i];

                // Rule checks
                if (piece.type === 'flag' && !placementInfo.hq.some(p => p[0]===pos[0] && p[1]===pos[1])) continue;
                if (piece.type === 'landmine' && !placementInfo.backRows.includes(pos[0])) continue;
                if (piece.type === 'bomb' && placementInfo.frontRow === pos[0]) continue;

                // Place the piece
                piece.position = { r: pos[0], c: pos[1] };
                gameState.board[pos[0]][pos[1]] = piece;
                availablePositions.splice(i, 1); // Remove the used position
                placed = true;
                break; // Exit the loop once placed
            }
        };

        // Place special pieces with placement restrictions first
        placePiece('flag');
        placePiece('landmine');
        placePiece('landmine');
        placePiece('landmine');
        placePiece('bomb');
        placePiece('bomb');

        // Shuffle the remaining general pieces
        shuffleArray(pieces);

        // Place the rest of the pieces into the remaining shuffled positions
        pieces.forEach(piece => {
            if (availablePositions.length > 0) {
                // Simply take the next available position from the shuffled list
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

    function isValidMove(startPos, endPos) {
        const piece = gameState.board[startPos.r][startPos.c];
        if (!piece || piece.type === 'flag' || piece.type === 'landmine') return false;
        const targetPiece = gameState.board[endPos.r][endPos.c];
        if (targetPiece && targetPiece.player === piece.player) return false;
        if (targetPiece && isCamp(endPos)) return false;
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
        if (defender.type === 'flag') {
            return gameState.commanderLost[attacker.player]
                ? { isDraw: true, isGameOver: true }
                : { winner: attacker, loser: defender, isGameOver: true };
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
                    piece.revealed = true;
                    const flagEl = boardContainer.querySelector(`[data-piece-id='${piece.id}']`);
                    if (flagEl) flagEl.classList.add('revealed-flag');
                    return;
                }
            }
        }
    }

    function handleMove(startPos, endPos) {
        const attacker = gameState.board[startPos.r][startPos.c];
        const defender = gameState.board[endPos.r][endPos.c];
        attacker.position = endPos;
        gameState.board[startPos.r][startPos.c] = null;

        if (defender) { // Attack
            const result = determineBattle(attacker, defender);
            if (result.isGameOver) {
                endGame(result.isDraw ? null : result.winner.player);
                if (!result.isDraw) gameState.board[endPos.r][endPos.c] = result.winner;
                renderBoard();
                return;
            } else if (result.isTie) {
                gameState.board[endPos.r][endPos.c] = null;
                if (attacker.type === 'commander') { gameState.commanderLost[attacker.player] = true; revealFlag(attacker.player); }
                if (defender.type === 'commander') { gameState.commanderLost[defender.player] = true; revealFlag(defender.player); }
            } else if (result.winner === attacker) {
                gameState.board[endPos.r][endPos.c] = attacker;
                if (result.loser.type === 'commander') { gameState.commanderLost[result.loser.player] = true; revealFlag(result.loser.player); }
            } else { // Defender wins
                gameState.board[endPos.r][endPos.c] = defender;
                 if (result.loser.type === 'commander') { gameState.commanderLost[result.loser.player] = true; revealFlag(result.loser.player); }
            }
        } else { // Move
            gameState.board[endPos.r][endPos.c] = attacker;
        }

        switchPlayer();
    }

    function switchPlayer() {
        if (gameState.isGameOver) return;
        gameState.currentPlayer = gameState.currentPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
        updateStatus(`輪到 ${gameState.currentPlayer === 'red' ? '紅方' : '黑方'} 行動`);
        renderBoard();

        if (gameState.gameMode === 'pvai' && gameState.currentPlayer === AI_PLAYER) {
            setTimeout(triggerAIMove, 1000);
        }
    }

    function triggerAIMove() {
        // ... (AI logic remains the same)
        if (gameState.isGameOver) return;
        const attackMoves = [], passiveMoves = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = gameState.board[r][c];
                if (piece && piece.player === AI_PLAYER) {
                    const startPos = { r, c };
                    // Simplified destination check for AI
                    const destinations = [{r:r-1,c:c}, {r:r+1,c:c}, {r:r,c:c-1}, {r:r,c:c+1}];
                    for (const endPos of destinations) {
                         if (endPos.r >= 0 && endPos.r < ROWS && endPos.c >= 0 && endPos.c < COLS && isValidMove(startPos, endPos)) {
                            const move = { startPos, endPos };
                            const target = gameState.board[endPos.r][endPos.c];
                            if (target && target.player !== AI_PLAYER) attackMoves.push(move);
                            else passiveMoves.push(move);
                        }
                    }
                }
            }
        }
        let chosenMove = null;
        if (attackMoves.length > 0) chosenMove = attackMoves[Math.floor(Math.random() * attackMoves.length)];
        else if (passiveMoves.length > 0) chosenMove = passiveMoves[Math.floor(Math.random() * passiveMoves.length)];
        if (chosenMove) handleMove(chosenMove.startPos, chosenMove.endPos);
        else endGame(PLAYERS.RED);
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
            selectedPieceInfo = null; // Deselect after any move attempt
            renderBoard(); // Re-render to remove highlight
        } else {
            const pieceData = gameState.board[r][c];
            if (pieceData && pieceData.player === gameState.currentPlayer) {
                selectedPieceInfo = { piece: pieceData, domElement: cell.querySelector('.piece') };
                renderBoard(); // Re-render to add highlight
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
                    pieceEl.textContent = pieceData.name;
                    if(pieceData.id === selectedId) pieceEl.classList.add('selected');
                    if(pieceData.type === 'flag' && pieceData.revealed) pieceEl.classList.add('revealed-flag');
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
