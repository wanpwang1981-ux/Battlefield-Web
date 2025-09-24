const express = require('express');
const GameLogic = require('../common/gameLogic.js');

const app = express();
const port = 3000;

app.use(express.json());

// A simple welcome endpoint
app.get('/', (req, res) => {
  res.send('陸軍棋 AI 伺服器已啟動！');
});

// Example endpoint to demonstrate using shared logic
app.get('/api/new-board', (req, res) => {
    const newBoard = GameLogic.initBoard();
    res.json({
        message: 'New board initialized successfully on the backend.',
        board: newBoard
    });
});

// Endpoint to run a headless CvC game
app.post('/api/run-cvc', (req, res) => {
    console.log("Running a headless CvC game...");
    const result = runHeadlessCvC();
    console.log("Game finished. Winner:", result.winner);
    res.json(result);
});

function runHeadlessCvC() {
    let board = GameLogic.initBoard();
    let currentPlayer = GameLogic.PLAYERS.RED;
    let turnCount = 0;
    const MAX_TURNS = 200; // Prevent infinite loops

    while (turnCount < MAX_TURNS) {
        turnCount++;

        // Check for win by no moves
        const allMoves = GameLogic.getAllMovesForPlayer(board, currentPlayer);
        if (allMoves.length === 0) {
            return { winner: currentPlayer === GameLogic.PLAYERS.RED ? GameLogic.PLAYERS.BLACK : GameLogic.PLAYERS.RED, reason: 'No moves left', turns: turnCount };
        }

        // For this simulation, we'll use Normal AI vs Normal AI
        const opponent = currentPlayer === GameLogic.PLAYERS.RED ? GameLogic.PLAYERS.BLACK : GameLogic.PLAYERS.RED;
        const chosenMove = GameLogic.executeNormalAITurn(board, currentPlayer, opponent);

        // Apply the move
        const { from, to } = chosenMove;
        const attacker = board[from.r][from.c];
        const defender = board[to.r][to.c];

        if (defender) {
            if(defender.type === 'flag') {
                 return { winner: currentPlayer, reason: 'Flag captured', turns: turnCount };
            }
            const combatResult = GameLogic.simulateCombat(attacker, defender);
            board[from.r][from.c] = null;
            if (combatResult.winner === 'attacker') {
                board[to.r][to.c] = attacker;
            } else if (combatResult.winner === 'defender') {
                 // attacker is removed
            } else { // tie
                board[to.r][to.c] = null;
            }
        } else {
            board[to.r][to.c] = attacker;
            board[from.r][from.c] = null;
        }

        // Switch player
        currentPlayer = opponent;
    }

    return { winner: 'draw', reason: 'Max turns reached', turns: turnCount };
}


app.listen(port, () => {
  console.log(`伺服器正在 http://localhost:${port} 上運行`);
});
