document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameModeSelection = document.getElementById('game-mode-selection');
    const mainGameScreen = document.getElementById('main-game-screen');
    const pvpButton = document.getElementById('pvp-button');
    const pvaiButton = document.getElementById('pvai-button');
    const boardContainer = document.getElementById('board-container');
    const gameStatusArea = document.querySelector('#game-status-area p');
    const newGameButton = document.getElementById('new-game-button');
    const capturedContainerRed = document.querySelector('#player-one-info .captured-pieces');
    const capturedContainerBlack = document.querySelector('#player-two-info .captured-pieces');

    // --- Game Constants ---
    const ROWS = 12;
    const COLS = 5;
    const PLAYERS = { RED: 'red', BLACK: 'black' };
    const HUMAN_PLAYER = PLAYERS.RED;
    const AI_PLAYER = PLAYERS.BLACK;
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
    let statusTimeout;

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
                pieceSet.push({ id: `${player}-${type}-${i}`, type: type, player: player, ...PIECE_DATA[type], revealed: false, position: {r: -1, c: -1} });
            }
        });
        return pieceSet;
    }
    function getPlayerPlacementInfo(player) {
        const isRed = player === PLAYERS.RED;
        const info = {};
        info.hq = isRed ? [[11, 1], [11, 3]] : [[0, 1], [0, 3]];
        info.backRows = isRed ? [10, 11] : [0, 1];
        info.frontRow = isRed ? 6 : 5;
        const baseCampSpots = [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]];
        info.camp = isRed ? baseCampSpots.map(p => [p[0] + 6, p[1]]) : baseCampSpots.map(p => [5 - p[0], p[1]]);
        let positions = [];
        const playerStartRow = isRed ? 6 : 0;
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 5; c++) {
                const currentPos = [playerStartRow + r, c];
                if (!info.camp.some(campPos => campPos[0] === currentPos[0] && campPos[1] === currentPos[1])) {
                    positions.push(currentPos);
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
                for (let j = 0; j < availablePositions.length; j++) {
                    const pos = availablePositions[j];
                    if (validator(pos)) {
                        piece.position = { r: pos[0], c: pos[1] };
                        gameState.board[pos[0]][pos[1]] = piece;
                        availablePositions.splice(j, 1);
                        break;
                    }
                }
            }
        };
        placePieceType('flag', 1, (pos) => placementInfo.hq.some(p => p[0] === pos[0] && p[1] === pos[1]));
        placePieceType('landmine', 3, (pos) => placementInfo.backRows.includes(pos[0]));
        placePieceType('bomb', 2, (pos) => pos[0] !== placementInfo.frontRow);
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
        attacker.revealed = true;
        defender.revealed = true;
        if (defender.type === 'flag') return { winner: attacker, loser: defender, isGameOver: true };
        if (attacker.type === 'bomb' || defender.type === 'bomb') return { isTie: true, attacker, defender };
        if (defender.type === 'landmine') return attacker.type === 'engineer' ? { winner: attacker, loser: defender } : { winner: defender, loser: attacker };
        if (attacker.rank === defender.rank) return { isTie: true, attacker, defender };
        return attacker.rank > defender.rank ? { winner: attacker, loser: defender } : { winner: defender, loser: attacker };
    }
    function handleMove(startPos, endPos) {
        const attacker = gameState.board[startPos.r][startPos.c];
        const defender = gameState.board[endPos.r][endPos.c];
        attacker.position = endPos;
        gameState.board[startPos.r][startPos.c] = null;
        let battleMessage = '';
        if (defender) {
            const result = determineBattle(attacker, defender);
            const attackerName = `【${attacker.name}】(${attacker.player === 'red' ? '紅' : '黑'})`;
            const defenderName = `【${defender.name}】(${defender.player === 'red' ? '紅' : '黑'})`;
            if (result.isGameOver) {
                gameState.board[endPos.r][endPos.c] = result.winner;
                gameState.capturedPieces[result.winner.player].push(result.loser);
                endGame(result.winner.player); return;
            } else if (result.isTie) {
                battleMessage = `${attackerName} 與 ${defenderName} 同歸於盡！`;
                gameState.board[endPos.r][endPos.c] = null;
                gameState.capturedPieces[attacker.player].push(defender);
                gameState.capturedPieces[defender.player].push(attacker);
            } else if (result.winner === attacker) {
                battleMessage = `${attackerName} 吃掉 ${defenderName}！`;
                gameState.board[endPos.r][endPos.c] = attacker;
                gameState.capturedPieces[attacker.player].push(defender);
            } else {
                battleMessage = `${defenderName} 吃掉 ${attackerName}！`;
                gameState.board[endPos.r][endPos.c] = defender;
                gameState.capturedPieces[defender.player].push(attacker);
            }
        } else {
            gameState.board[endPos.r][endPos.c] = attacker;
        }
        switchPlayer(battleMessage);
    }
    function hasLegalMoves(player) {
        for (let r1 = 0; r1 < ROWS; r1++) { for (let c1 = 0; c1 < COLS; c1++) {
            if (gameState.board[r1][c1]?.player === player) {
                for (let r2 = 0; r2 < ROWS; r2++) { for (let c2 = 0; c2 < COLS; c2++) {
                    if ((r1 !== r2 || c1 !== c2) && isValidMove({ r: r1, c: c1 }, { r: r2, c: c2 })) return true;
                }}
            }
        }}
        return false;
    }
    function switchPlayer(battleMessage = '') {
        if (gameState.isGameOver) return;
        gameState.currentPlayer = gameState.currentPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
        renderBoard();
        if (!hasLegalMoves(gameState.currentPlayer)) {
            const winner = gameState.currentPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
            endGame(winner, '無子可動'); return;
        }
        const turnMessage = `輪到 ${gameState.currentPlayer === 'red' ? '紅方' : '黑方'} 行動`;
        if(battleMessage) {
            updateStatus(battleMessage, 2000, turnMessage);
        } else {
            updateStatus(turnMessage);
        }
        if (gameState.gameMode === 'pvai' && gameState.currentPlayer === AI_PLAYER) {
            setTimeout(triggerAIMove, 1000);
        }
    }
    function triggerAIMove() {
        if (gameState.isGameOver) return;
        const attackMoves = [], passiveMoves = [];
        for (let r1 = 0; r1 < ROWS; r1++) { for (let c1 = 0; c1 < COLS; c1++) {
            if (gameState.board[r1][c1]?.player === AI_PLAYER) {
                for (let r2 = 0; r2 < ROWS; r2++) { for (let c2 = 0; c2 < COLS; c2++) {
                    if ((r1 !== r2 || c1 !== c2) && isValidMove({ r: r1, c: c1 }, { r: r2, c: c2 })) {
                        const move = { startPos: { r: r1, c: c1 }, endPos: { r: r2, c: c2 } };
                        if (gameState.board[r2][c2]) attackMoves.push(move); else passiveMoves.push(move);
                    }
                }}
            }
        }}
        const move = attackMoves.length > 0 ? attackMoves[Math.floor(Math.random() * attackMoves.length)] : passiveMoves[Math.floor(Math.random() * passiveMoves.length)];
        if (move) {
            updateStatus('電腦正在思考...', 1000);
            setTimeout(() => handleMove(move.startPos, move.endPos), 1000);
        }
    }
    function handleBoardClick(event) {
        if (gameState.isGameOver || (gameState.gameMode === 'pvai' && gameState.currentPlayer === AI_PLAYER)) return;
        const cell = event.target.closest('.cell');
        if (!cell) return;
        const r = parseInt(cell.dataset.row), c = parseInt(cell.dataset.col);
        if (selectedPieceInfo) {
            const startPos = selectedPieceInfo.piece.position;
            const endPos = { r, c };
            if (isValidMove(startPos, endPos)) handleMove(startPos, endPos);
            selectedPieceInfo = null;
            if(!gameState.isGameOver) renderBoard();
        } else {
            const pieceData = gameState.board[r][c];
            if (pieceData?.player === gameState.currentPlayer) {
                selectedPieceInfo = { piece: pieceData };
                renderBoard();
            }
        }
    }
    function updateStatus(message, duration = 0, nextMessage = '') {
        clearTimeout(statusTimeout);
        gameStatusArea.textContent = message;
        if (duration > 0) {
            statusTimeout = setTimeout(() => {
                updateStatus(nextMessage || `輪到 ${gameState.currentPlayer === 'red' ? '紅方' : '黑方'} 行動`);
            }, duration);
        }
    }
    function renderCapturedPieces() {
        capturedContainerRed.innerHTML = '';
        capturedContainerBlack.innerHTML = '';
        const renderIcons = (container, pieces, colorClass) => {
            pieces.sort((a,b) => b.rank - a.rank).forEach(piece => {
                const icon = document.createElement('div');
                icon.className = `captured-piece-icon ${colorClass}`;
                icon.textContent = piece.name;
                container.appendChild(icon);
            });
        };
        renderIcons(capturedContainerRed, gameState.capturedPieces.black, 'piece-red');
        renderIcons(capturedContainerBlack, gameState.capturedPieces.red, 'piece-black');
    }
    function renderBoard() {
        boardContainer.innerHTML = '';
        const selectedId = selectedPieceInfo?.piece.id;
        for (let r = 0; r < ROWS; r++) { for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r; cell.dataset.col = c;
            const pieceData = gameState.board[r][c];
            if (pieceData) {
                const pieceEl = document.createElement('div');
                pieceEl.className = `piece piece-${pieceData.player}`;
                const isCurrentPlayer = pieceData.player === gameState.currentPlayer;
                const canSee = (gameState.gameMode === 'pvp' && isCurrentPlayer) || (gameState.gameMode === 'pvai' && pieceData.player === HUMAN_PLAYER) || pieceData.revealed;
                if (canSee) {
                    pieceEl.textContent = pieceData.name;
                } else {
                    pieceEl.textContent = '棋';
                    pieceEl.classList.add('unrevealed');
                }
                if (pieceData.id === selectedId) pieceEl.classList.add('selected');
                cell.appendChild(pieceEl);
            }
            boardContainer.appendChild(cell);
        }}
        renderCapturedPieces();
    }
    function endGame(winner, reason = '奪得軍旗') {
        gameState.isGameOver = true;
        let message;
        if (winner) {
            const winnerName = winner === 'red' ? '紅方' : '黑方';
            message = `遊戲結束！${winnerName}獲勝！(${reason})`;
        } else {
            message = `遊戲結束！雙方平局！`;
        }
        updateStatus(message);
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

    pvpButton.addEventListener('click', () => startGame('pvp'));
    pvaiButton.addEventListener('click', () => startGame('pvai'));
    newGameButton.addEventListener('click', () => {
        mainGameScreen.style.display = 'none';
        gameModeSelection.style.display = 'block';
    });
    boardContainer.addEventListener('click', handleBoardClick);
});
