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
    const AI_PLAYER = PLAYERS.BLACK; // AI is always black for simplicity
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
        const placePiece = (pieceType) => {
            const pieceIndex = pieces.findIndex(p => p.type === pieceType);
            const piece = pieces.splice(pieceIndex, 1)[0];
            let placed = false;
            let attempts = 0;
            while(!placed && attempts < 100) {
                const posIndex = Math.floor(Math.random() * availablePositions.length);
                const pos = availablePositions[posIndex];
                if (piece.type === 'flag' && !placementInfo.hq.some(p => p[0]===pos[0] && p[1]===pos[1])) { attempts++; continue; }
                if (piece.type === 'landmine' && !placementInfo.backRows.includes(pos[0])) { attempts++; continue; }
                if (piece.type === 'bomb' && placementInfo.frontRow === pos[0]) { attempts++; continue; }
                piece.position = { r: pos[0], c: pos[1] };
                gameState.board[pos[0]][pos[1]] = piece;
                availablePositions.splice(posIndex, 1);
                placed = true;
            }
        };
        placePiece('flag');
        placePiece('landmine'); placePiece('landmine'); placePiece('landmine');
        placePiece('bomb'); placePiece('bomb');
        pieces.sort(() => Math.random() - 0.5);
        pieces.forEach(piece => {
            if(availablePositions.length > 0) {
                const posIndex = Math.floor(Math.random() * availablePositions.length);
                const pos = availablePositions.splice(posIndex, 1)[0];
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
    function isValidMove(startPos, endPos) {
        const piece = gameState.board[startPos.r][startPos.c];
        if (!piece || piece.type === 'flag' || piece.type === 'landmine') return false;
        const targetPiece = gameState.board[endPos.r][endPos.c];
        if (targetPiece && targetPiece.player === piece.player) return false;
        const dr = Math.abs(startPos.r - endPos.r);
        const dc = Math.abs(startPos.c - endPos.c);
        return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
    }

    function determineBattle(attacker, defender) {
        if (defender.type === 'flag') return { winner: attacker, loser: defender, isGameOver: true };
        if (attacker.type === 'bomb' || defender.type === 'bomb') return { winner: null, loser: null, isTie: true };
        if (defender.type === 'landmine') {
            return attacker.type === 'engineer' ? { winner: attacker, loser: defender } : { winner: defender, loser: attacker };
        }
        if (attacker.rank === defender.rank) return { winner: null, loser: null, isTie: true };
        if (attacker.rank > defender.rank) return { winner: attacker, loser: defender };
        return { winner: defender, loser: attacker };
    }

    function handleMove(startPos, endPos) {
        const attacker = gameState.board[startPos.r][startPos.c];
        const defender = gameState.board[endPos.r][endPos.c];
        attacker.position = endPos;
        gameState.board[startPos.r][startPos.c] = null;

        if (defender) {
            const result = determineBattle(attacker, defender);
            if (result.isGameOver) {
                gameState.board[endPos.r][endPos.c] = result.winner;
                endGame(result.winner.player);
                return;
            } else if (result.isTie) {
                gameState.board[endPos.r][endPos.c] = null;
            } else if (result.winner === attacker) {
                gameState.board[endPos.r][endPos.c] = attacker;
            } else { // Defender wins
                gameState.board[endPos.r][endPos.c] = defender;
            }
        } else {
            gameState.board[endPos.r][endPos.c] = attacker;
        }

        switchPlayer();
    }

    function switchPlayer() {
        if (gameState.isGameOver) return;
        gameState.currentPlayer = gameState.currentPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
        updateStatus(`輪到 ${gameState.currentPlayer === 'red' ? '紅方' : '黑方'} 行動`);

        if (gameState.gameMode === 'pvai' && gameState.currentPlayer === AI_PLAYER) {
            setTimeout(triggerAIMove, 1000);
        }
    }

    function triggerAIMove() {
        if (gameState.isGameOver) return;
        const attackMoves = [];
        const passiveMoves = [];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = gameState.board[r][c];
                if (piece && piece.player === AI_PLAYER) {
                    const startPos = { r, c };
                    const destinations = [{r:r-1,c:c}, {r:r+1,c:c}, {r:r,c:c-1}, {r:r,c:c+1}];
                    for (const endPos of destinations) {
                        if (endPos.r >= 0 && endPos.r < ROWS && endPos.c >= 0 && endPos.c < COLS && isValidMove(startPos, endPos)) {
                            const move = { startPos, endPos };
                            const target = gameState.board[endPos.r][endPos.c];
                            if (target && target.player !== AI_PLAYER) {
                                attackMoves.push(move);
                            } else {
                                passiveMoves.push(move);
                            }
                        }
                    }
                }
            }
        }

        let chosenMove = null;
        if (attackMoves.length > 0) {
            chosenMove = attackMoves[Math.floor(Math.random() * attackMoves.length)];
        } else if (passiveMoves.length > 0) {
            chosenMove = passiveMoves[Math.floor(Math.random() * passiveMoves.length)];
        }

        if (chosenMove) {
            handleMove(chosenMove.startPos, chosenMove.endPos);
        } else {
            endGame(PLAYERS.RED); // AI has no moves, Human wins
        }
    }

    function handleBoardClick(event) {
        if (gameState.isGameOver || (gameState.gameMode === 'pvai' && gameState.currentPlayer === AI_PLAYER)) return;
        const cell = event.target.closest('.cell');
        if (!cell) return;
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);

        if (selectedPieceInfo) {
            const startPos = selectedPieceInfo.piece.position;
            const endPos = { r, c };
            if (isValidMove(startPos, endPos)) {
                handleMove(startPos, endPos);
            }
            selectedPieceInfo.domElement.classList.remove('selected');
            selectedPieceInfo = null;
        } else {
            const pieceData = gameState.board[r][c];
            if (pieceData && pieceData.player === gameState.currentPlayer) {
                selectedPieceInfo = { piece: pieceData, domElement: cell.querySelector('.piece') };
                selectedPieceInfo.domElement.classList.add('selected');
            }
        }
    }

    function updateStatus(message) {
        gameStatusArea.textContent = message;
    }

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
                    pieceEl.textContent = pieceData.name; // Debug: show name
                    if(pieceData.id === selectedId) {
                        pieceEl.classList.add('selected');
                    }
                    cell.appendChild(pieceEl);
                }
                boardContainer.appendChild(cell);
            }
        }
    }

    function endGame(winner) {
        gameState.isGameOver = true;
        const winnerName = winner === 'red' ? '紅方' : '黑方';
        updateStatus(`遊戲結束！${winnerName}獲勝！`);
    }

    function startGame(mode) {
        gameState = {
            gameMode: mode,
            currentPlayer: PLAYERS.RED,
            board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)),
            capturedPieces: { [PLAYERS.RED]: [], [PLAYERS.BLACK]: [] },
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
