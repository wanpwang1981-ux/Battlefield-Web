/**
 * 陸軍棋遊戲主邏輯
 * 監聽 DOMContentLoaded 事件，確保在整個 HTML 文件被載入和解析完成後才執行腳本。
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素參考 ---
    // 透過 getElementById 獲取所有需要的 HTML 元素，方便後續操作。
    const modeSelection = document.getElementById('mode-selection');
    const difficultySelection = document.getElementById('difficulty-selection');
    const pvpButton = document.getElementById('pvp-button');
    const pvaiButton = document.getElementById('pvai-button');
    const easyAIButton = document.getElementById('easy-ai-button');
    const normalAIButton = document.getElementById('normal-ai-button');
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

    // --- 遊戲常數 ---
    const ROWS = 12; // 棋盤總行數
    const COLS = 5;  // 棋盤總列數
    const PLAYERS = { RED: 'red', BLACK: 'black' }; // 定義玩家

    // 定義所有棋子類型、階級和數量。階級越高的棋子，rank 值越大。
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

    // --- 遊戲狀態管理 ---
    // 使用一個物件來儲存所有遊戲相關的狀態，方便管理和追蹤。
    let gameState = {
        gameMode: null,      // 遊戲模式: 'pvp' 或 'pvai'
        difficulty: 'easy',  // AI 難度: 'easy' 或 'normal'
        currentPlayer: null, // 當前玩家: 'red' 或 'black'
        selectedPiece: null, // 當前選中的棋子: { piece, row, col }
        boardState: [],      // 棋盤狀態: 一個二維陣列，儲存每個格子的棋子資訊
        capturedPieces: {    // 被吃的棋子
            [PLAYERS.RED]: [],
            [PLAYERS.BLACK]: []
        },
        gameOver: false,     // 遊戲是否結束
    };

    // --- 事件監聽器 ---
    pvpButton.addEventListener('click', () => startGame('pvp'));

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

    backToModeSelectionButton.addEventListener('click', () => {
        difficultySelection.classList.add('hidden');
        modeSelection.classList.remove('hidden');
    });
    resetButton.addEventListener('click', () => {
        // 重置遊戲，返回模式選擇畫面
        modeSelection.classList.remove('hidden');
        difficultySelection.classList.add('hidden');
        gameArea.classList.add('hidden');
        resetGameState();
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

    /**
     * 將遊戲狀態重設為初始值。
     * 用於開始新遊戲或重新開始時。
     */
    function resetGameState() {
        gameState = {
            gameMode: null,
            currentPlayer: null,
            selectedPiece: null,
            boardState: [],
            capturedPieces: { [PLAYERS.RED]: [], [PLAYERS.BLACK]: [] },
            gameOver: false,
        };
        // 清空所有 UI 顯示
        boardElement.innerHTML = '';
        gameLogElement.innerHTML = '';
        capturedRedElement.innerHTML = '';
        capturedBlackElement.innerHTML = '';
        updateStatus('等待遊戲開始');
        updatePlayerTurn('');
    }

    /**
     * 根據選擇的模式開始一局新遊戲。
     * @param {string} mode - 選擇的遊戲模式 ('pvp' 或 'pvai')。
     */
    function startGame(mode) {
        console.log(`以 ${mode} 模式開始遊戲。`);
        resetGameState(); // 先重置狀態
        boardElement.style.pointerEvents = 'auto'; // 確保棋盤可以點擊
        gameState.gameMode = mode;

        // 顯示遊戲區域，隱藏模式選擇畫面
        modeSelection.classList.add('hidden');
        gameArea.classList.remove('hidden');

        // 初始化遊戲
        gameState.currentPlayer = PLAYERS.RED;
        updatePlayerTurn(PLAYERS.RED);
        updateStatus('遊戲進行中');
        initBoard(); // 初始化棋盤佈局
        renderBoard(); // 將棋盤渲染到畫面上
        logAction(`遊戲開始！模式: ${mode.toUpperCase()}。 紅方先手。`);
    }

    /**
     * 更新狀態列的訊息。
     * @param {string} message - 要顯示的訊息。
     */
    function updateStatus(message) {
        statusBarElement.textContent = `狀態: ${message}`;
    }

    /**
     * 更新輪到哪位玩家的提示。
     * @param {string} player - 當前玩家 ('red' 或 'black')。
     */
    function updatePlayerTurn(player) {
        const playerText = player === PLAYERS.RED ? '紅方' : player === PLAYERS.BLACK ? '黑方' : '';
        playerTurnElement.textContent = player ? `輪到: ${playerText}`: '';
    }

    /**
     * 在遊戲日誌中新增一條紀錄。
     * @param {string} message - 要記錄的訊息。
     */
    function logAction(message) {
        const logEntry = document.createElement('div');
        logEntry.textContent = message;
        // 將新紀錄插入到日誌的最上方
        gameLogElement.insertBefore(logEntry, gameLogElement.firstChild);
    }

    /**
     * 初始化棋盤狀態，並根據規則隨機佈置雙方棋子。
     */
    function initBoard() {
        // 1. 建立一個空的 12x5 棋盤
        gameState.boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

        // 2. 定義紅黑雙方的佈棋區域
        const redZone = { startRow: 6, endRow: 11 };
        const blackZone = { startRow: 0, endRow: 5 };

        // 3. 放置紅方棋子
        placePlayerPieces(PLAYERS.RED, redZone);

        // 4. 根據紅方棋子的位置，鏡像對稱地放置黑方棋子
        mirrorRedToBlack(redZone, blackZone);
    }

    /**
     * 為指定玩家產生一副完整的棋子。
     * @param {string} player - 玩家 ('red' 或 'black')。
     * @returns {Array<Object>} 一個包含該玩家所有棋子的陣列。
     */
    function createPlayerPieces(player) {
        const pieces = [];
        for (const type in PIECE_TYPES) {
            for (let i = 0; i < PIECE_TYPES[type].count; i++) {
                pieces.push({
                    type: type,
                    rank: PIECE_TYPES[type].rank,
                    name: PIECE_TYPES[type].name,
                    player: player,
                    revealed: false, // 棋子初始為未翻開狀態
                });
            }
        }
        return pieces;
    }

    /**
     * 使用 Fisher-Yates 演算法來隨機打亂一個陣列。
     * @param {Array} array - 要被打亂的陣列。
     */
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 根據陸軍棋規則，為單一玩家放置所有棋子。
     * @param {string} player - 要放置棋子的玩家。
     * @param {Object} zone - 該玩家的佈棋區域 { startRow, endRow }。
     */
    function placePlayerPieces(player, zone) {
        let allPieces = createPlayerPieces(player);

        // 獲取該玩家所有可以放棋子的格子
        const allPlayerCells = [];
        for (let r = zone.startRow; r <= zone.endRow; r++) {
            for (let c = 0; c < COLS; c++) {
                allPlayerCells.push({ r, c });
            }
        }

        // 輔助函式：放置有特殊規則的棋子
        const placeRestrictedPieces = (piecesToPlace, validCells) => {
            shuffle(validCells); // 隨機打亂合法位置
            piecesToPlace.forEach(piece => {
                const cell = validCells.pop(); // 取出一個隨機位置
                if (cell) {
                    gameState.boardState[cell.r][cell.c] = piece;
                    // 從可放置的總格子列表中移除已被佔用的格子
                    const indexInAll = allPlayerCells.findIndex(c => c.r === cell.r && c.c === cell.c);
                    if (indexInAll !== -1) allPlayerCells.splice(indexInAll, 1);
                }
            });
        };

        // 規則 1: 軍旗必須放在大本營
        const flag = allPieces.find(p => p.type === 'flag');
        allPieces = allPieces.filter(p => p.type !== 'flag'); // 從待放列表中移除軍旗
        const headquartersCells = allPlayerCells.filter(c => (c.r === zone.endRow && (c.c === 1 || c.c === 3)));
        placeRestrictedPieces([flag], headquartersCells);

        // 規則 2: 地雷必須放在最後兩排
        const landmines = allPieces.filter(p => p.type === 'landmine');
        allPieces = allPieces.filter(p => p.type !== 'landmine');
        const lastTwoRowsCells = allPlayerCells.filter(c => c.r >= zone.endRow - 1);
        placeRestrictedPieces(landmines, lastTwoRowsCells);

        // 規則 3: 炸彈不能放在第一排
        const bombs = allPieces.filter(p => p.type === 'bomb');
        allPieces = allPieces.filter(p => p.type !== 'bomb');
        const notFirstRowCells = allPlayerCells.filter(c => c.r !== zone.startRow);
        placeRestrictedPieces(bombs, notFirstRowCells);

        // 放置剩下的所有棋子
        shuffle(allPieces); // 隨機打亂剩下的棋子
        shuffle(allPlayerCells); // 隨機打亂剩下的空位
        allPieces.forEach(piece => {
            const cell = allPlayerCells.pop();
            if (cell) {
                gameState.boardState[cell.r][cell.c] = piece;
            }
        });
    }

    /**
     * 將紅方的棋盤佈局鏡像複製給黑方。
     * @param {Object} redZone - 紅方區域。
     * @param {Object} blackZone - 黑方區域。
     */
    function mirrorRedToBlack(redZone, blackZone) {
        for (let r = redZone.startRow; r <= redZone.endRow; r++) {
            for (let c = 0; c < COLS; c++) {
                const redPiece = gameState.boardState[r][c];
                if (redPiece) {
                    const blackPiece = { ...redPiece, player: PLAYERS.BLACK };
                    const mirrorRow = blackZone.startRow + (redZone.endRow - r);
                    const mirrorCol = (COLS - 1) - c;
                    gameState.boardState[mirrorRow][mirrorCol] = blackPiece;
                }
            }
        }
    }

    /**
     * 根據目前的 gameState，將整個棋盤和棋子渲染到畫面上。
     */
    function renderBoard() {
        boardElement.innerHTML = ''; // 每次渲染前清空棋盤
        const validMoves = gameState.selectedPiece ? getValidMoves(gameState.selectedPiece.row, gameState.selectedPiece.col) : [];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.classList.add('cell');

                // 標示特殊區域 (行營、大本營)
                if (isCamp(r, c)) cell.classList.add('camp');
                if (isHeadquarters(r, c)) cell.classList.add('headquarters');

                // 如果是合法移動位置，添加提示樣式
                if (validMoves.some(move => move.r === r && move.c === c)) {
                    cell.classList.add('valid-move');
                }

                const piece = gameState.boardState[r][c];
                if (piece) {
                    // 棋子可見性邏輯：
                    // 在 PvAI 模式，只顯示紅方（玩家）的棋子。
                    // 在 PvP 模式（本機對戰），為方便遊玩，雙方棋子都會顯示。
                    // 任何情況下，被翻開的棋子都會顯示。
                    const isUnknown = !(gameState.gameMode === 'pvp' || piece.player === PLAYERS.RED || piece.revealed);
                    const pieceElement = createPieceElement(piece, isUnknown);

                    // 如果是當前選中的棋子，添加選中樣式
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

    /**
     * 處理棋盤格子的點擊事件。
     * 這是玩家互動的核心函式，負責選棋和移動。
     * @param {number} row - 被點擊的行。
     * @param {number} col - 被點擊的列。
     */
    function handleCellClick(row, col) {
        if (gameState.gameOver) return; // 遊戲結束後不能再操作

        const clickedPiece = gameState.boardState[row][col];

        // 如果已經有選中的棋子
        if (gameState.selectedPiece) {
            const { piece, row: fromRow, col: fromCol } = gameState.selectedPiece;
            const validMoves = getValidMoves(fromRow, fromCol);
            const isMoveValid = validMoves.some(move => move.r === row && move.c === col);

            if (isMoveValid) {
                // 如果點擊的是合法移動位置，則移動棋子
                movePiece(fromRow, fromCol, row, col);
            } else {
                // 否則，取消選中，或選擇另一顆己方棋子
                gameState.selectedPiece = null;
                if (clickedPiece && clickedPiece.player === gameState.currentPlayer) {
                    selectPiece(row, col);
                }
                renderBoard(); // 重新渲染以更新顯示
            }
        } else if (clickedPiece && clickedPiece.player === gameState.currentPlayer) {
            // 如果沒有選中的棋子，且點擊的是自己的棋子，則選中它
            selectPiece(row, col);
        }
    }

    /**
     * 選中一個棋子並更新遊戲狀態。
     * @param {number} row - 棋子所在的行。
     * @param {number} col - 棋子所在的列。
     */
    function selectPiece(row, col) {
        const piece = gameState.boardState[row][col];
        // 軍旗和地雷不能移動
        if (piece.type === 'flag' || piece.type === 'landmine') {
            gameState.selectedPiece = null;
        } else {
            gameState.selectedPiece = { piece, row, col };
        }
        renderBoard(); // 重新渲染以顯示選中狀態和合法移動位置
    }

    /**
     * 計算給定位置的棋子所有合法的移動位置。
     * @param {number} row - 棋子所在的行。
     * @param {number} col - 棋子所在的列。
     * @returns {Array<Object>} 一個包含所有合法移動位置座標 {r, c} 的陣列。
     */
    function getValidMoves(row, col) {
        const moves = [];
        const piece = gameState.boardState[row][col];
        if (!piece) return [];

        const directions = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }]; // 上下左右

        for (const dir of directions) {
            const newRow = row + dir.r;
            const newCol = col + dir.c;

            // 檢查是否超出棋盤邊界
            if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) {
                continue;
            }

            const targetPiece = gameState.boardState[newRow][newCol];
            // 不能移動到有己方棋子的位置
            if (targetPiece && targetPiece.player === piece.player) {
                continue;
            }

            // 根據簡化規則，所有可移動棋子都可走，暫不考慮鐵軌或行營的特殊規則
            moves.push({ r: newRow, c: newCol });
        }
        return moves;
    }

    /**
     * 移動棋子，並觸發後續的遊戲邏輯（如戰鬥、換邊、AI回合）。
     * @param {number} fromRow - 起始行。
     * @param {number} fromCol - 起始列。
     * @param {number} toRow - 目標行。
     * @param {number} toCol - 目標列。
     */
    function movePiece(fromRow, fromCol, toRow, toCol) {
        const attacker = gameState.boardState[fromRow][fromCol];
        const defender = gameState.boardState[toRow][toCol];
        const player = attacker.player === 'red' ? '紅方' : '黑方';

        if (defender) { // 如果目標位置有棋子，則發生戰鬥
            const combatResult = handleCombat(attacker, defender);
            const { winner, log } = combatResult;

            updateStatus(log); // 更新狀態列顯示戰鬥結果
            logAction(`${player}: ${log}`); // 記錄戰鬥日誌

            // 將被移除的棋子加入 capturedPieces 列表
            if (combatResult.removed) {
                combatResult.removed.forEach(p => {
                    gameState.capturedPieces[p.player].push(p);
                });
            }

            // 根據戰鬥結果更新棋盤
            gameState.boardState[fromRow][fromCol] = null;
            if (winner === 'attacker') {
                gameState.boardState[toRow][toCol] = attacker;
            } else if (winner === 'defender') {
                gameState.boardState[toRow][toCol] = defender;
            } else { // 同歸於盡
                gameState.boardState[toRow][toCol] = null;
            }

        } else { // 如果目標是空格，直接移動
            logAction(`${player} ${attacker.name} 移動到 (${toRow}, ${toCol})`);
            gameState.boardState[toRow][toCol] = attacker;
            gameState.boardState[fromRow][fromCol] = null;
        }

        // 清除選中狀態並輪換玩家
        gameState.selectedPiece = null;
        gameState.currentPlayer = gameState.currentPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;

        // 更新 UI
        renderBoard();
        updatePlayerTurn(gameState.currentPlayer);
        updateCapturedPieces();
        checkWinCondition(); // 每次移動後檢查勝利/失敗條件

        // 如果是 PvAI 模式且輪到 AI，則觸發 AI 回合
        if (gameState.gameMode === 'pvai' && gameState.currentPlayer === PLAYERS.BLACK && !gameState.gameOver) {
            boardElement.style.pointerEvents = 'none'; // AI思考時，禁止玩家點擊
            setTimeout(() => {
                executeAITurn();
                if (!gameState.gameOver) {
                    boardElement.style.pointerEvents = 'auto'; // AI行動結束後，恢復玩家點擊
                }
            }, 1000); // 延遲 1 秒，模擬 AI 思考
        }
    }

    /**
     * 處理兩棋子相遇時的戰鬥邏輯。
     * @param {Object} attacker - 攻擊方棋子。
     * @param {Object} defender - 防守方棋子。
     * @returns {Object} 一個描述戰鬥結果的物件 { winner, removed, log }。
     */
    function handleCombat(attacker, defender) {
        // 戰鬥發生時，雙方棋子都會被翻開
        attacker.revealed = true;
        defender.revealed = true;

        const aName = attacker.name;
        const dName = defender.name;

        // 規則：炸彈與任何棋子（除了軍旗）相遇，同歸於盡
        if (attacker.type === 'bomb' || defender.type === 'bomb') {
            return { winner: 'tie', removed: [attacker, defender], log: `炸彈與 ${dName} 同歸於盡！` };
        }
        // 規則：吃到對方軍旗，遊戲結束
        if (defender.type === 'flag') {
            gameState.gameOver = true; // 直接設定遊戲結束狀態
            return { winner: 'attacker', removed: [defender], log: `司令部被佔領！${attacker.player === 'red' ? '紅方' : '黑方'} 獲勝！` };
        }
        // 規則：踩到地雷
        if (defender.type === 'landmine') {
            if (attacker.type === 'engineer') {
                return { winner: 'attacker', removed: [defender], log: `工兵成功排雷！` };
            } else {
                return { winner: 'defender', removed: [attacker], log: `${aName} 踩到地雷陣亡！` };
            }
        }
        // 規則：普通棋子比大小
        if (attacker.rank > defender.rank) {
            return { winner: 'attacker', removed: [defender], log: `${aName} 吃掉 ${dName}！` };
        }
        if (attacker.rank < defender.rank) {
            return { winner: 'defender', removed: [attacker], log: `${aName} 被 ${dName} 吃掉！` };
        }
        // 規則：階級相同，同歸於盡
        if (attacker.rank === defender.rank) {
            return { winner: 'tie', removed: [attacker, defender], log: `${aName} 與 ${dName} 同歸於盡！` };
        }
    }

    /**
     * 更新畫面上顯示的雙方被吃棋子列表。
     */
    function updateCapturedPieces() {
        capturedRedElement.innerHTML = '';
        capturedBlackElement.innerHTML = '';

        gameState.capturedPieces.red.forEach(p => capturedRedElement.appendChild(createPieceElement(p)));
        gameState.capturedPieces.black.forEach(p => capturedBlackElement.appendChild(createPieceElement(p)));
    }

    /**
     * 建立一個棋子的 DOM 元素。
     * 用於在棋盤上和被吃區域顯示棋子。
     * @param {Object} piece - 棋子物件。
     * @param {boolean} isUnknown - 是否顯示為未知（棋背）。
     * @returns {HTMLElement} 棋子的 div 元素。
     */
    function createPieceElement(piece, isUnknown = false) {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('piece', piece.player);
        if (isUnknown) {
            pieceElement.textContent = '棋';
            pieceElement.classList.add('unknown');
        } else {
            pieceElement.textContent = piece.name;
        }
        return pieceElement;
    }

    // --- 輔助函式：判斷特殊棋盤格 ---
    function isCamp(row, col) {
        return (row >= 2 && row <= 3 && (col === 1 || col === 3)) ||
               (row === 4 && (col === 0 || col === 2 || col === 4)) ||
               (row >= 7 && row <= 8 && (col === 1 || col === 3)) ||
               (row === 6 && (col === 0 || col === 2 || col === 4));
    }

    function isHeadquarters(row, col) {
        return (row === 0 && (col === 1 || col === 3)) ||
               (row === 11 && (col === 1 || col === 3));
    }

    /**
     * 檢查勝利或失敗條件，如果滿足則結束遊戲。
     */
    function checkWinCondition() {
        if (gameState.gameOver) return;

        // 條件 1: 軍旗被吃 (此條件由 handleCombat 觸發，這裡僅作最終確認)
        const redFlag = gameState.capturedPieces.black.find(p => p.type === 'flag');
        const blackFlag = gameState.capturedPieces.red.find(p => p.type === 'flag');

        if (redFlag) {
            endGame(PLAYERS.BLACK, "黑方佔領了紅方軍旗！");
            return;
        }
        if (blackFlag) {
            endGame(PLAYERS.RED, "紅方佔領了黑方軍旗！");
            return;
        }

        // 條件 2: 當前玩家已無任何可移動的棋子
        let hasMoves = false;
        const player = gameState.currentPlayer;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = gameState.boardState[r][c];
                // 找出所有屬於當前玩家且可以移動的棋子
                if (piece && piece.player === player && piece.type !== 'flag' && piece.type !== 'landmine') {
                    if (getValidMoves(r, c).length > 0) {
                        hasMoves = true; // 只要找到一個合法移動，就跳出迴圈
                        break;
                    }
                }
            }
            if (hasMoves) break;
        }

        if (!hasMoves) {
            const winner = player === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;
            const loserName = player === PLAYERS.RED ? '紅方' : '黑方';
            endGame(winner, `${loserName}無子可動，${winner === 'red' ? '紅方' : '黑方'}獲勝！`);
        }
    }

    /**
     * 結束遊戲並顯示最終結果。
     * @param {string | null} winner - 獲勝的玩家，若平手則為 null。
     * @param {string} message - 要顯示的結束訊息。
     */
    function endGame(winner, message) {
        gameState.gameOver = true;
        updateStatus(message);
        logAction(`遊戲結束: ${message}`);
        playerTurnElement.textContent = '遊戲結束';
        boardElement.style.pointerEvents = 'none'; // 遊戲結束，禁止再點擊棋盤
    }

    /**
     * AI 的主要邏輯，決定並執行一步棋。
     * 根據遊戲難度，呼叫對應的 AI 函式。
     */
    function executeAITurn() {
        if (gameState.difficulty === 'normal') {
            executeNormalAITurn();
        } else {
            executeEasyAITurn();
        }
    }

    /**
     * 簡單難度 AI：隨機選擇可行的攻擊或移動。
     */
    function executeEasyAITurn() {
        if (gameState.gameOver) return;

        const allMoves = [];
        // 1. 找出 AI (黑方) 所有可以移動的棋子及其所有合法走法
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = gameState.boardState[r][c];
                if (piece && piece.player === PLAYERS.BLACK && piece.type !== 'flag' && piece.type !== 'landmine') {
                    const validMoves = getValidMoves(r, c);
                    validMoves.forEach(move => {
                        allMoves.push({ from: { r, c }, to: move });
                    });
                }
            }
        }

        // 2. 將所有走法分為「攻擊性走法」和「非攻擊性走法」
        const attackingMoves = allMoves.filter(move => gameState.boardState[move.to.r][move.to.c] !== null);
        const nonAttackingMoves = allMoves.filter(move => gameState.boardState[move.to.r][move.to.c] === null);

        let chosenMove = null;
        // 3. 優先從攻擊性走法中隨機選擇一個
        if (attackingMoves.length > 0) {
            chosenMove = attackingMoves[Math.floor(Math.random() * attackingMoves.length)];
        } else if (nonAttackingMoves.length > 0) {
            // 如果沒有可攻擊的，則從非攻擊性走法中隨機選擇一個
            chosenMove = nonAttackingMoves[Math.floor(Math.random() * nonAttackingMoves.length)];
        }

        // 4. 執行選擇的走法
        if (chosenMove) {
            // 根據新的遊戲規則，AI 移動時不再主動揭露棋子身份。
            // 棋子只在戰鬥中被揭露。
            movePiece(chosenMove.from.r, chosenMove.from.c, chosenMove.to.r, chosenMove.to.c);
        } else {
            // 如果 AI 無棋可走，觸發勝利/失敗檢查
            checkWinCondition();
        }
    }

    /**
     * 普通難度 AI：使用評分系統和防禦邏輯選擇最佳移動。
     */
    function executeNormalAITurn() {
        if (gameState.gameOver) return;

        // --- 1. 防禦邏輯：檢查是否有高價值棋子受到威脅 ---
        const highValuePieces = ['field_marshal', 'general', 'major_general', 'brigadier'];
        const myPieces = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = gameState.boardState[r][c];
                if (piece && piece.player === PLAYERS.BLACK) {
                    myPieces.push({ piece, r, c });
                }
            }
        }

        for (const myPiece of myPieces) {
            if (!highValuePieces.includes(myPiece.piece.type)) continue;

            const directions = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
            for (const dir of directions) {
                const enemyR = myPiece.r + dir.r;
                const enemyC = myPiece.c + dir.c;

                if (enemyR >= 0 && enemyR < ROWS && enemyC >= 0 && enemyC < COLS) {
                    const enemyPiece = gameState.boardState[enemyR][enemyC];
                    if (enemyPiece && enemyPiece.player === PLAYERS.RED && enemyPiece.revealed) {
                        const combatResult = simulateCombat(enemyPiece, myPiece.piece);
                        if (combatResult.winner === 'attacker') { // 'attacker' is the player piece
                            // 威脅存在！立即尋找逃跑路線
                            const escapeMoves = getValidMoves(myPiece.r, myPiece.c).filter(move => !gameState.boardState[move.r][move.c]);
                            if (escapeMoves.length > 0) {
                                const escapeMove = escapeMoves[Math.floor(Math.random() * escapeMoves.length)];
                                logAction(`AI: ${myPiece.piece.name} 偵測到威脅，緊急撤離！`);
                                movePiece(myPiece.r, myPiece.c, escapeMove.r, escapeMove.c);
                                return; // 執行防禦移動後結束回合
                            }
                        }
                    }
                }
            }
        }

        // --- 2. 若無立即危險，則執行攻擊/移動評分邏輯 ---
        let allMoves = [];
        myPieces.forEach(p => {
            if (p.piece.type !== 'flag' && p.piece.type !== 'landmine') {
                const validMoves = getValidMoves(p.r, p.c);
                validMoves.forEach(move => {
                    allMoves.push({ from: { r: p.r, c: p.c }, to: move, piece: p.piece });
                });
            }
        });

        if (allMoves.length === 0) {
            checkWinCondition();
            return;
        }

        let bestScore = -Infinity;
        let bestMoves = [];
        allMoves.forEach(move => {
            const score = getMoveScore(move);
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        });

        const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];

        if (chosenMove) {
            movePiece(chosenMove.from.r, chosenMove.from.c, chosenMove.to.r, chosenMove.to.c);
        }
    }

    /**
     * 評估一個移動的分數。
     * @param {Object} move - 要評估的移動 { from, to, piece }。
     * @returns {number} 該移動的分數。
     */
    function getMoveScore(move) {
        const attacker = move.piece;
        const defender = gameState.boardState[move.to.r][move.to.c];

        // --- 攻擊性移動評分 ---
        if (defender) {
            // 攻擊一個未知的棋子：給予一個較低的正分，鼓勵用低階棋子試探。
            if (!defender.revealed) {
                // 分數 = 5 - 攻擊方階級。 (工兵 rank 3 -> 得 2 分, 司令 rank 11 -> 得 -6 分)
                return 5 - attacker.rank;
            }

            // 攻擊一個已知的棋子：模擬戰鬥結果來評分。
            const combatResult = simulateCombat(attacker, defender);

            // 贏：非常高的分數。吃掉對方越高階的棋子，分數越高。
            if (combatResult.winner === 'attacker') {
                return 100 + (defender.rank * 10);
            }
            // 平手：中等分數。用低階棋子換掉對方棋子比較划算。
            if (combatResult.winner === 'tie') {
                return 50 - attacker.rank;
            }
            // 輸：非常低的負分，強力避免此類移動。
            if (combatResult.winner === 'defender') {
                return -100 - attacker.rank;
            }
        }

        // --- 非攻擊性移動評分 ---
        // 基礎分為 0，鼓勵向前移動（對黑方來說，r 座標增加即為向前）。
        let score = (move.to.r - move.from.r);
        return score;
    }

    /**
     * 模擬戰鬥以預測結果，不會真的改變遊戲狀態。
     * @param {Object} attacker
     * @param {Object} defender
     * @returns {Object} 一個描述模擬戰鬥結果的物件 { winner }。
     */
    function simulateCombat(attacker, defender) {
        if (attacker.type === 'bomb' || defender.type === 'bomb') {
            return { winner: 'tie' };
        }
        if (defender.type === 'flag') {
            return { winner: 'attacker' };
        }
        if (defender.type === 'landmine') {
            return attacker.type === 'engineer' ? { winner: 'attacker' } : { winner: 'defender' };
        }
        // 使用 Number() 確保進行的是數值比較
        if (Number(attacker.rank) > Number(defender.rank)) {
            return { winner: 'attacker' };
        }
        if (Number(attacker.rank) < Number(defender.rank)) {
            return { winner: 'defender' };
        }
        return { winner: 'tie' };
    }
});
