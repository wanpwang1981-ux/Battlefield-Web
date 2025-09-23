document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const modeSelection = document.getElementById('mode-selection');
    const pvpButton = document.getElementById('pvp-button');
    const pvaiButton = document.getElementById('pvai-button');
    const gameArea = document.getElementById('game-area');
    const boardElement = document.getElementById('board');
    const playerTurnElement = document.getElementById('player-turn');
    const statusBarElement = document.getElementById('status-bar');
    const gameLogElement = document.getElementById('game-log');
    const resetButton = document.getElementById('reset-button');
    const capturedRedElement = document.getElementById('captured-red').querySelector('.pieces');
    const capturedBlackElement = document.getElementById('captured-black').querySelector('.pieces');

    // --- Constants ---
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

    // --- Game State ---
    let gameState = {
        gameMode: null, // 'pvp' or 'pvai'
        currentPlayer: null,
        selectedPiece: null, // { piece, row, col }
        boardState: [], // 2D array representing the board
        capturedPieces: {
            [PLAYERS.RED]: [],
            [PLAYERS.BLACK]: []
        },
        gameOver: false,
    };

    // --- Event Listeners ---
    pvpButton.addEventListener('click', () => startGame('pvp'));
    pvaiButton.addEventListener('click', () => startGame('pvai'));
    resetButton.addEventListener('click', () => {
        // Full reset
        modeSelection.classList.remove('hidden');
        gameArea.classList.add('hidden');
        resetGameState();
    });

    /**
     * Resets the game state to its initial values.
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
        // Clear UI elements
        boardElement.innerHTML = '';
        gameLogElement.innerHTML = '';
        capturedRedElement.innerHTML = '';
        capturedBlackElement.innerHTML = '';
        updateStatus('等待遊戲開始');
        updatePlayerTurn('');
    }


    /**
     * Starts the game with the selected mode.
     * @param {string} mode - The selected game mode ('pvp' or 'pvai').
     */
    function startGame(mode) {
        console.log(`Starting game in ${mode} mode.`);
        resetGameState();
        boardElement.style.pointerEvents = 'auto'; // Ensure board is clickable
        gameState.gameMode = mode;
        modeSelection.classList.add('hidden');
        gameArea.classList.remove('hidden');

        // Setup game
        gameState.currentPlayer = PLAYERS.RED;
        updatePlayerTurn(PLAYERS.RED);
        updateStatus('遊戲進行中');
        initBoard();
        renderBoard();
        logAction(`遊戲開始！模式: ${mode.toUpperCase()}. 紅方先手。`);
    }

    /**
     * Updates the status bar message.
     * @param {string} message - The message to display.
     */
    function updateStatus(message) {
        statusBarElement.textContent = `狀態: ${message}`;
    }

    /**
     * Updates the player turn indicator.
     */
    function updatePlayerTurn(player) {
        const playerText = player === PLAYERS.RED ? '紅方' : player === PLAYERS.BLACK ? '黑方' : '';
        playerTurnElement.textContent = player ? `輪到: ${playerText}`: '';
    }

    /**
     * Adds a message to the game log.
     * @param {string} message - The log message.
     */
    function logAction(message) {
        const logEntry = document.createElement('div');
        logEntry.textContent = message;
        gameLogElement.insertBefore(logEntry, gameLogElement.firstChild);
    }

    /**
     * Initializes the board state with pieces placed according to rules.
     */
    function initBoard() {
        // 1. Create an empty board
        gameState.boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

        // 2. Define placement zones
        const redZone = { startRow: 6, endRow: 11 };
        const blackZone = { startRow: 0, endRow: 5 };

        // --- Place Red Pieces ---
        placePlayerPieces(PLAYERS.RED, redZone);

        // --- Place Black Pieces (mirror of Red) ---
        mirrorRedToBlack(redZone, blackZone);
    }

    /**
     * Generates a list of all pieces for a player.
     * @param {string} player - 'red' or 'black'.
     * @returns {Array<Object>} A list of piece objects.
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
                    revealed: false,
                });
            }
        }
        return pieces;
    }

    /**
     * Shuffles an array in place using the Fisher-Yates algorithm.
     * @param {Array} array - The array to shuffle.
     */
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Places all pieces for a single player according to the rules. (Corrected Logic)
     * @param {string} player - The player to place pieces for.
     * @param {Object} zone - The player's zone with startRow and endRow.
     */
    function placePlayerPieces(player, zone) {
        let allPieces = createPlayerPieces(player);

        const allPlayerCells = [];
        for (let r = zone.startRow; r <= zone.endRow; r++) {
            for (let c = 0; c < COLS; c++) {
                 // There are no impassable cells in the setup zones (6-11 and 0-5)
                allPlayerCells.push({ r, c });
            }
        }

        const placeRestrictedPieces = (piecesToPlace, validCells) => {
            shuffle(validCells);
            piecesToPlace.forEach(piece => {
                const cell = validCells.pop();
                if (cell) {
                    gameState.boardState[cell.r][cell.c] = piece;
                    // Remove this cell from the main list of available cells
                    const indexInAll = allPlayerCells.findIndex(c => c.r === cell.r && c.c === cell.c);
                    if (indexInAll !== -1) allPlayerCells.splice(indexInAll, 1);
                }
            });
        };

        // Rule 1: Flag in Headquarters
        const flag = allPieces.find(p => p.type === 'flag');
        allPieces = allPieces.filter(p => p.type !== 'flag');
        const headquartersCells = allPlayerCells.filter(c => (c.r === zone.endRow && (c.c === 1 || c.c === 3)));
        placeRestrictedPieces([flag], headquartersCells);

        // Rule 2: Landmines in the last two rows
        const landmines = allPieces.filter(p => p.type === 'landmine');
        allPieces = allPieces.filter(p => p.type !== 'landmine');
        const lastTwoRowsCells = allPlayerCells.filter(c => c.r >= zone.endRow - 1);
        placeRestrictedPieces(landmines, lastTwoRowsCells);

        // Rule 3: Bombs not in the first row
        const bombs = allPieces.filter(p => p.type === 'bomb');
        allPieces = allPieces.filter(p => p.type !== 'bomb');
        const notFirstRowCells = allPlayerCells.filter(c => c.r !== zone.startRow);
        placeRestrictedPieces(bombs, notFirstRowCells);

        // Place remaining pieces in the rest of the available cells
        shuffle(allPieces);
        shuffle(allPlayerCells);
        allPieces.forEach(piece => {
            const cell = allPlayerCells.pop();
            if (cell) {
                gameState.boardState[cell.r][cell.c] = piece;
            }
        });
    }

    /**
     * Mirrors the Red player's setup to the Black player's side.
     * @param {Object} redZone - Red player's zone.
     * @param {Object} blackZone - Black player's zone.
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
     * Renders the entire game board based on the current gameState.
     */
    function renderBoard() {
        boardElement.innerHTML = ''; // Clear previous state
        const validMoves = gameState.selectedPiece ? getValidMoves(gameState.selectedPiece.row, gameState.selectedPiece.col) : [];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.classList.add('cell');

                // Add special zone styling
                if (isCamp(r, c)) cell.classList.add('camp');
                if (isHeadquarters(r, c)) cell.classList.add('headquarters');

                // Highlight valid moves
                if (validMoves.some(move => move.r === r && move.c === c)) {
                    cell.classList.add('valid-move');
                }

                const piece = gameState.boardState[r][c];
                if (piece) {
                    // Piece visibility logic:
                    // A piece is 'unknown' if it is not revealed AND not the player's own piece in PvAI mode.
                    // In PvP (hot-seat) mode, all pieces are considered known from the start.
                    const isUnknown = !(gameState.gameMode === 'pvp' || piece.player === PLAYERS.RED || piece.revealed);
                    const pieceElement = createPieceElement(piece, isUnknown);

                    // Highlight selected piece
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
     * Handles clicks on any cell of the board.
     * @param {number} row - The clicked row.
     * @param {number} col - The clicked column.
     */
    function handleCellClick(row, col) {
        if (gameState.gameOver) return;

        const clickedPiece = gameState.boardState[row][col];

        if (gameState.selectedPiece) {
            const { piece, row: fromRow, col: fromCol } = gameState.selectedPiece;
            const validMoves = getValidMoves(fromRow, fromCol);
            const isMoveValid = validMoves.some(move => move.r === row && move.c === col);

            if (isMoveValid) {
                movePiece(fromRow, fromCol, row, col);
            } else {
                // Deselect or select another piece
                gameState.selectedPiece = null;
                // If clicking another of your own pieces, select it
                if (clickedPiece && clickedPiece.player === gameState.currentPlayer) {
                    selectPiece(row, col);
                }
                renderBoard();
            }
        } else if (clickedPiece && clickedPiece.player === gameState.currentPlayer) {
            // No piece selected, so select this one if it's movable
            selectPiece(row, col);
        }
    }

    /**
     * Selects a piece and updates the game state.
     * @param {number} row
     * @param {number} col
     */
    function selectPiece(row, col) {
        const piece = gameState.boardState[row][col];
        // Flags and Landmines cannot be moved.
        if (piece.type === 'flag' || piece.type === 'landmine') {
            gameState.selectedPiece = null;
        } else {
            gameState.selectedPiece = { piece, row, col };
        }
        renderBoard();
    }

    /**
     * Calculates all valid moves for a piece at a given position.
     * @param {number} row
     * @param {number} col
     * @returns {Array<Object>} An array of valid move coordinates {r, c}.
     */
    function getValidMoves(row, col) {
        const moves = [];
        const piece = gameState.boardState[row][col];
        if (!piece) return [];

        const directions = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];

        for (const dir of directions) {
            const newRow = row + dir.r;
            const newCol = col + dir.c;

            // Check bounds
            if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) {
                continue;
            }

            const targetPiece = gameState.boardState[newRow][newCol];
            // Cannot move to a cell occupied by a friendly piece
            if (targetPiece && targetPiece.player === piece.player) {
                continue;
            }

            // Simplified movement: no special rules for camps for now
            moves.push({ r: newRow, c: newCol });
        }
        return moves;
    }


    /**
     * Moves a piece and triggers subsequent game logic.
     * @param {number} fromRow
     * @param {number} fromCol
     * @param {number} toRow
     * @param {number} toCol
     */
    function movePiece(fromRow, fromCol, toRow, toCol) {
        const attacker = gameState.boardState[fromRow][fromCol];
        const defender = gameState.boardState[toRow][toCol];
        const player = attacker.player === 'red' ? '紅方' : '黑方';

        if (defender) { // There is a piece to attack
            const combatResult = handleCombat(attacker, defender);
            const { winner, log } = combatResult;

            updateStatus(log);
            logAction(`${player}: ${log}`);

            // Update captured pieces lists
            if (combatResult.removed) {
                combatResult.removed.forEach(p => {
                    gameState.capturedPieces[p.player].push(p);
                });
            }

            // Update board state based on combat outcome
            gameState.boardState[fromRow][fromCol] = null;
            if (winner === 'attacker') {
                gameState.boardState[toRow][toCol] = attacker;
            } else if (winner === 'defender') {
                // Defender stays, attacker is already removed from fromRow
                gameState.boardState[toRow][toCol] = defender;
            } else { // tie
                gameState.boardState[toRow][toCol] = null;
            }

        } else { // Simple move
            logAction(`${player} ${attacker.name} 移動到 (${toRow}, ${toCol})`);
            gameState.boardState[toRow][toCol] = attacker;
            gameState.boardState[fromRow][fromCol] = null;
        }

        // Clear selection and switch player
        gameState.selectedPiece = null;
        gameState.currentPlayer = gameState.currentPlayer === PLAYERS.RED ? PLAYERS.BLACK : PLAYERS.RED;

        // Update UI
        renderBoard();
        updatePlayerTurn(gameState.currentPlayer);
        updateCapturedPieces();
        checkWinCondition();

        // If it's AI's turn, trigger it
        if (gameState.gameMode === 'pvai' && gameState.currentPlayer === PLAYERS.BLACK && !gameState.gameOver) {
            boardElement.style.pointerEvents = 'none';
            setTimeout(() => {
                executeAITurn();
                if (!gameState.gameOver) {
                    boardElement.style.pointerEvents = 'auto';
                }
            }, 1000); // 1 second delay
        }
    }


    /**
     * Determines the outcome of a battle between two pieces.
     * @param {Object} attacker
     * @param {Object} defender
     * @returns {Object} An object describing the combat result.
     */
    function handleCombat(attacker, defender) {
        attacker.revealed = true;
        defender.revealed = true;

        const aName = attacker.name;
        const dName = defender.name;

        // Rule: Bomb meets anything -> both perish
        if (attacker.type === 'bomb' || defender.type === 'bomb') {
            return { winner: 'tie', removed: [attacker, defender], log: `炸彈與 ${dName} 同歸於盡！` };
        }
        // Rule: Attacker meets Flag -> game over
        if (defender.type === 'flag') {
            gameState.gameOver = true; // Set flag here
            return { winner: 'attacker', removed: [defender], log: `司令部被佔領！${attacker.player === 'red' ? '紅方' : '黑方'} 獲勝！` };
        }
        // Rule: Defender is a Landmine
        if (defender.type === 'landmine') {
            if (attacker.type === 'engineer') {
                return { winner: 'attacker', removed: [defender], log: `工兵成功排雷！` };
            } else {
                return { winner: 'defender', removed: [attacker], log: `${aName} 踩到地雷陣亡！` };
            }
        }
        // Rule: Normal rank comparison
        if (attacker.rank > defender.rank) {
            return { winner: 'attacker', removed: [defender], log: `${aName} 吃掉 ${dName}！` };
        }
        if (attacker.rank < defender.rank) {
            return { winner: 'defender', removed: [attacker], log: `${aName} 被 ${dName} 吃掉！` };
        }
        // Rule: Ranks are equal -> both perish
        if (attacker.rank === defender.rank) {
            return { winner: 'tie', removed: [attacker, defender], log: `${aName} 與 ${dName} 同歸於盡！` };
        }
    }

    /**
     * Updates the display of captured pieces for both players.
     */
    function updateCapturedPieces() {
        capturedRedElement.innerHTML = '';
        capturedBlackElement.innerHTML = '';

        gameState.capturedPieces.red.forEach(p => capturedRedElement.appendChild(createPieceElement(p)));
        gameState.capturedPieces.black.forEach(p => capturedBlackElement.appendChild(createPieceElement(p)));
    }

    /**
     * Creates a DOM element for a piece (used for board and captured display).
     * @param {Object} piece
     * @param {boolean} isCaptured - If true, the piece is smaller and not interactive.
     * @returns {HTMLElement}
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


    // --- Helper functions for special zones ---
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


    // function getPieceAt(row, col) {}
    // function setPieceAt(row, col, piece) {}

    /**
     * Checks for win/loss conditions and ends the game if met.
     */
    function checkWinCondition() {
        if (gameState.gameOver) return; // Don't check if already over

        // 1. Flag capture condition (checked inside handleCombat, which sets gameOver)
        // We just formalize the message here.
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

        // 2. No legal moves condition
        let hasMoves = false;
        const player = gameState.currentPlayer;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = gameState.boardState[r][c];
                if (piece && piece.player === player && piece.type !== 'flag' && piece.type !== 'landmine') {
                    if (getValidMoves(r, c).length > 0) {
                        hasMoves = true;
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
     * Ends the game and displays the result.
     * @param {string | null} winner - The winning player, or null for a draw.
     * @param {string} message - The message to display.
     */
    function endGame(winner, message) {
        gameState.gameOver = true;
        updateStatus(message);
        logAction(`遊戲結束: ${message}`);
        playerTurnElement.textContent = '遊戲結束';
        boardElement.style.pointerEvents = 'none'; // Disable clicks
    }


    /**
     * The AI's logic to decide and execute a move.
     */
    function executeAITurn() {
        if (gameState.gameOver) return;

        const allMoves = [];
        // 1. Find all possible moves for the AI player (black)
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

        // 2. Categorize moves
        const attackingMoves = allMoves.filter(move => gameState.boardState[move.to.r][move.to.c] !== null);
        const nonAttackingMoves = allMoves.filter(move => gameState.boardState[move.to.r][move.to.c] === null);

        let chosenMove = null;
        // 3. Prioritize attacking moves
        if (attackingMoves.length > 0) {
            chosenMove = attackingMoves[Math.floor(Math.random() * attackingMoves.length)];
        } else if (nonAttackingMoves.length > 0) {
            chosenMove = nonAttackingMoves[Math.floor(Math.random() * nonAttackingMoves.length)];
        }

        // 4. Execute the chosen move
        if (chosenMove) {
            // Reveal the AI piece before moving
            gameState.boardState[chosenMove.from.r][chosenMove.from.c].revealed = true;
            movePiece(chosenMove.from.r, chosenMove.from.c, chosenMove.to.r, chosenMove.to.c);
        } else {
            // AI has no moves, which is a loss condition. checkWinCondition will handle it.
            checkWinCondition();
        }
    }
});
