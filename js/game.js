/**
 * 陸軍棋遊戲主邏輯 - 前端部分
 * 這個檔案負責處理所有與瀏覽器 DOM 互動的邏輯，例如事件監聽、畫面渲染等。
 * 核心的遊戲規則和 AI 邏輯由 `common/gameLogic.js` 提供。
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素參考 ---
    const modeSelection = document.getElementById('mode-selection');
    const difficultySelection = document.getElementById('difficulty-selection');
    const pvpButton = document.getElementById('pvp-button');
    const pvaiButton = document.getElementById('pvai-button');
    const cvcButton = document.getElementById('cvc-button');
    const easyAIButton = document.getElementById('easy-ai-button');
    const normalAIButton = document.getElementById('normal-ai-button');
    const hardAIButton = document.getElementById('hard-ai-button');
    const backToModeSelectionButton = document.getElementById('back-to-mode-selection');
    const gameArea = document.getElementById('game-area');
    const boardElement = document.getElementById('board');
    const playerTurnElement = document.getElementById('player-turn');
    const statusBarElement = document.getElementById('status-bar');
    const gameLogElement = document.getElementById('game-log');
    const resetButton = document.getElementById('reset-button');
    const downloadLogButton = document.getElementById('download-log-button');
    const capturedRedElement = document.getElementById('captured-red').querySelector('.pieces');
    const capturedBlackElement = document.getElementById('captured-black').querySelector('.pieces');

    // --- 從共享邏輯中獲取常數和函式 ---
    // GameLogic is loaded from common/gameLogic.js in index.html
    const { ROWS, COLS, PLAYERS, initBoard, getValidMoves, simulateCombat, executeEasyAITurn, executeNormalAITurn, executeHardAITurn, getAllMovesForPlayer } = GameLogic;

    // --- 遊戲狀態管理 ---
    let gameState = {};

    function setupInitialGameState() {
        gameState = {
            gameMode: null,
            difficulty: 'easy',
            currentPlayer: null,
            selectedPiece: null,
            boardState: [],
            capturedPieces: { [PLAYERS.RED]: [], [PLAYERS.BLACK]: [] },
            gameOver: false,
        };
    }

    // --- 事件監聽器 ---
    pvpButton.addEventListener('click', () => startGame('pvp'));
    cvcButton.addEventListener('click', () => {
        gameState.difficulty = 'hard';
        startGame('cvc');
    });
    pvaiButton.addEventListener('click', () => {
        modeSelection.classList.add('hidden');
        difficultySelection.classList.remove('hidden');
    });
    easyAIButton.addEventListener('click', () => {
        gameState.difficulty = 'easy';
        startGame('pvai');
    });
    normalAIButton.addEventListener('click', () => {
        gameState.difficulty = 'normal';
        startGame('pvai');
    });
    hardAIButton.addEventListener('click', () => {
        gameState.difficulty = 'hard';
        startGame('pvai');
    });
    backToModeSelectionButton.addEventListener('click', () => {
        difficultySelection.classList.add('hidden');
        modeSelection.classList.remove('hidden');
    });
    resetButton.addEventListener('click', () => {
        modeSelection.classList.remove('hidden');
        difficultySelection.classList.add('hidden');
        gameArea.classList.add('hidden');
        setupInitialGameState();
        updateUI();
    });
    downloadLogButton.addEventListener('click', () => {
        const logText = gameLogElement.innerText;
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `luzhanqi_log_${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    function startGame(mode) {
        console.log(`以 ${mode} 模式開始遊戲，難度: ${gameState.difficulty}`);
        setupInitialGameState();
        gameState.gameMode = mode;

        boardElement.style.pointerEvents = 'auto';
        difficultySelection.classList.add('hidden');
        modeSelection.classList.add('hidden');
        gameArea.classList.remove('hidden');

        gameState.currentPlayer = PLAYERS.RED;
        gameState.boardState = initBoard();

        logAction(`遊戲開始！模式: ${mode.toUpperCase()}。 紅方先手。`);
        updateUI();

        if (mode === 'cvc') {
            boardElement.style.pointerEvents = 'none';
            setTimeout(() => triggerAITurn(), 200);
        }
    }

    // --- UI 更新函式 ---
    function updateUI() {
        renderBoard();
        updatePlayerTurn();
        updateCapturedPieces();
        updateStatus();
    }

    function updateStatus(message = '遊戲進行中') {
        if (gameState.gameOver) return;
        statusBarElement.textContent = `狀態: ${message}`;
    }

    function updatePlayerTurn() {
        if (gameState.gameOver) {
            playerTurnElement.textContent = '遊戲結束';
            return;
        }
        const playerText = gameState.currentPlayer === PLAYERS.RED ? '紅方' : '黑方';
        playerTurnElement.textContent = `輪到: ${playerText}`;
    }

    function logAction(message) {
        const logEntry = document.createElement('div');
        logEntry.textContent = message;
        gameLogElement.insertBefore(logEntry, gameLogElement.firstChild);
    }

    function renderBoard() {
        boardElement.innerHTML = '';
        const validMoves = gameState.selectedPiece ? getValidMoves(gameState.boardState, gameState.selectedPiece.row, gameState.selectedPiece.col) : [];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.classList.add('cell');

                if (isCamp(r, c)) cell.classList.add('camp');
                if (isHeadquarters(r, c)) cell.classList.add('headquarters');

                if (validMoves.some(move => move.r === r && move.c === c)) {
                    cell.classList.add('valid-move');
                }

                const piece = gameState.boardState[r][c];
                if (piece) {
                    const isPvAI = gameState.gameMode === 'pvai';
                    const isUnknown = !(piece.revealed || (isPvAI && piece.player === PLAYERS.RED));
                    const pieceElement = createPieceElement(piece, isUnknown);
                    if (gameState.selectedPiece && gameState.selectedPiece.row === r && gameState.selectedPiece.col === c) {
                        pieceElement.classList.add('selected');
                    }
                    cell.appendChild(pieceElement);
                }

                cell.addEventListener('click', () => handleCellClick(r, c));
                boardElement.appendChild(cell);
            }
        }
    }

    function updateCapturedPieces() {
        capturedRedElement.innerHTML = '';
        capturedBlackElement.innerHTML = '';
        gameState.capturedPieces.red.forEach(p => capturedRedElement.appendChild(createPieceElement(p)));
        gameState.capturedPieces.black.forEach(p => capturedBlackElement.appendChild(createPieceElement(p)));
    }

    function createPieceElement(piece, isUnknown = false) {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('piece', piece.player);
        pieceElement.textContent = isUnknown ? '棋' : piece.name;
        if(isUnknown) pieceElement.classList.add('unknown');
        return pieceElement;
    }

    // --- 遊戲核心互動邏輯 ---
    function handleCellClick(row, col) {
        const isHumanTurn = gameState.gameMode === 'pvp' || (gameState.gameMode === 'pvai' && gameState.currentPlayer === PLAYERS.RED);
        if (gameState.gameOver || !isHumanTurn) return;

        const clickedPiece = gameState.boardState[row][col];

        if (gameState.selectedPiece) {
            const { row: fromRow, col: fromCol } = gameState.selectedPiece;
            const validMoves = getValidMoves(gameState.boardState, fromRow, fromCol);
            const isMoveValid = validMoves.some(move => move.r === row && move.c === col);

            if (isMoveValid) {
                movePiece(fromRow, fromCol, row, col);
            } else {
                gameState.selectedPiece = null;
                if (clickedPiece && clickedPiece.player === gameState.currentPlayer) {
                    selectPiece(row, col);
                }
                renderBoard();
            }
        } else if (clickedPiece && clickedPiece.player === gameState.currentPlayer) {
            selectPiece(row, col);
        }
    }

    function selectPiece(row, col) {
        const piece = gameState.boardState[row][col];
        if (piece.type === 'flag' || piece.type === 'landmine') {
            gameState.selectedPiece = null;
        } else {
            gameState.selectedPiece = { piece, row, col };
        }
        renderBoard();
    }

    function movePiece(fromRow, fromCol, toRow, toCol) {
        const attacker = gameState.boardState[fromRow][fromCol];
        const defender = gameState.boardState[toRow][toCol];

        if (defender) {
            const combatResult = handleCombat(attacker, defender);
            updateStatus(combatResult.log);
            logAction(`${attacker.player === 'red' ? '紅方' : '黑方'}: ${combatResult.log}`);
            if (combatResult.removed) {
                combatResult.removed.forEach(p => gameState.capturedPieces[p.player].push(p));
            }
            gameState.boardState[fromRow][fromCol] = null;
            if (combatResult.winner === 'attacker') {
                attacker.revealed = true;
                gameState.boardState[toRow][toCol] = attacker;
            } else if (combatResult.winner === 'defender') {
                defender.revealed = true;
                gameState.boardState[toRow][toCol] = defender;
            } else {
                gameState.boardState[toRow][toCol] = null;
            }
        } else {
            logAction(`${attacker.player === 'red' ? '紅方' : '黑方'} ${attacker.name} 移動到 (${toRow}, ${toCol})`);
            gameState.boardState[toRow][toCol] = attacker;
            gameState.boardState[fromRow][fromCol] = null;
        }

        gameState.selectedPiece = null;
        gameState.currentPlayer = gameState.currentPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;

        updateUI();
        if (checkWinCondition()) return;
        triggerAITurn();
    }

    function handleCombat(attacker, defender) {
        attacker.revealed = true;
        defender.revealed = true;
        const simulationResult = simulateCombat(attacker, defender);
        let log;
        if (defender.type === 'flag') log = `司令部被佔領！${attacker.player === 'red' ? '紅方' : '黑方'} 獲勝！`;
        else if (defender.type === 'landmine') log = attacker.type === 'engineer' ? `工兵成功排雷！` : `${attacker.name} 踩到地雷陣亡！`;
        else if (attacker.type === 'bomb' || defender.type === 'bomb') log = `炸彈與 ${defender.name} 同歸於盡！`;
        else if (simulationResult.winner === 'attacker') log = `${attacker.name} 吃掉 ${defender.name}！`;
        else if (simulationResult.winner === 'defender') log = `${attacker.name} 被 ${defender.name} 吃掉！`;
        else log = `${attacker.name} 與 ${defender.name} 同歸於盡！`;

        const removed = simulationResult.winner === 'tie' ? [attacker, defender] : simulationResult.winner === 'attacker' ? [defender] : [attacker];
        return { ...simulationResult, removed, log };
    }

    function checkWinCondition() {
        if (gameState.gameOver) return true;
        const redFlag = gameState.capturedPieces.black.find(p => p.type === 'flag');
        const blackFlag = gameState.capturedPieces.red.find(p => p.type === 'flag');
        if (redFlag) return endGame(PLAYERS.BLACK, "黑方佔領了紅方軍旗！");
        if (blackFlag) return endGame(PLAYERS.RED, "紅方佔領了黑方軍旗！");

        const hasMoves = getAllMovesForPlayer(gameState.boardState, gameState.currentPlayer).length > 0;
        if (!hasMoves) {
            const winner = gameState.currentPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
            const loserName = gameState.currentPlayer === PLAYERS.RED ? '紅方' : '黑方';
            return endGame(winner, `${loserName}無子可動，${winner === 'red' ? '紅方' : '黑方'}獲勝！`);
        }
        return false;
    }

    function endGame(winner, message) {
        gameState.gameOver = true;
        updateStatus(message);
        logAction(`遊戲結束: ${message}`);
        updatePlayerTurn();
        boardElement.style.pointerEvents = 'none';
        return true;
    }

    function triggerAITurn() {
        const isAIsTurn = (gameState.gameMode === 'pvai' && gameState.currentPlayer === PLAYERS.BLACK) || gameState.gameMode === 'cvc';
        if (isAIsTurn && !gameState.gameOver) {
            const delay = gameState.gameMode === 'cvc' ? 50 : 1000;
            if (gameState.gameMode === 'pvai') boardElement.style.pointerEvents = 'none';

            setTimeout(() => {
                executeAITurn();
                if (gameState.gameMode === 'pvai' && !gameState.gameOver) {
                    boardElement.style.pointerEvents = 'auto';
                }
            }, delay);
        }
    }

    function executeAITurn() {
        const player = gameState.currentPlayer;
        const opponent = (player === PLAYERS.RED) ? PLAYERS.BLACK : PLAYERS.RED;
        let chosenMove;

        if (gameState.difficulty === 'hard') chosenMove = executeHardAITurn(gameState.boardState, player);
        else if (gameState.difficulty === 'normal') chosenMove = executeNormalAITurn(gameState.boardState, player, opponent);
        else chosenMove = executeEasyAITurn(gameState.boardState, player);

        if (chosenMove) {
            if(chosenMove.isDefensive) logAction(`AI (${player}): ${chosenMove.piece.name} 偵測到威脅，緊急撤離！`);
            movePiece(chosenMove.from.r, chosenMove.from.c, chosenMove.to.r, chosenMove.to.c);
        } else {
            checkWinCondition();
        }
    }

    function isCamp(r,c){return(r>=2&&r<=3&&(c===1||c===3))||(r===4&&(c===0||c===2||c===4))||(r>=7&&r<=8&&(c===1||c===3))||(r===6&&(c===0||c===2||c===4))}
    function isHeadquarters(r,c){return(r===0&&(c===1||c===3))||(r===11&&(c===1||c===3))}

    setupInitialGameState();
});
