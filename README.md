# 陸軍棋 v2.2 (Lu Zhan Qi)

This is a web-based implementation of the Chinese board game Lu Zhan Qi (also known as Land Battle Chess). The game is built using vanilla HTML, CSS, and JavaScript, with no external libraries or frameworks.

## How to Play

1.  Clone or download this repository.
2.  Open the `index.html` file in a modern web browser (like Chrome, Firefox, or Edge).
3.  The game will load, and you can start playing immediately.

## Features

-   **Two Game Modes**: Choose between Player-vs-Player (PvP) for hot-seat play or Player-vs-AI (PvAI) to challenge the computer.
-   **Secret Random Deployment**: Pieces are randomly placed on the board at the start of each game, following the official placement rules.
-   **Full Game UI**: Includes a game log, status bar, and display for captured pieces.
-   **Complete Ruleset**: Implements all standard combat rules, including special interactions for Bombs, Landmines, and Engineers.
-   **Basic AI**: The computer opponent will prioritize attacks but will make random moves otherwise.

## Core Game Rules

-   **Objective**: Capture the enemy's Flag (軍旗).
-   **Movement**: All pieces (except the Flag and Landmines) can move one space up, down, left, or right.
-   **Combat**:
    -   Higher rank pieces capture lower rank pieces.
    -   Pieces of the same rank are both eliminated.
    -   **Bombs (炸彈)**: Eliminate any piece they attack or are attacked by.
    -   **Landmines (地雷)**: Eliminate any piece that attacks them, except for the Engineer. Landmines do not move.
    -   **Engineers (工兵)**: Are the only pieces that can capture Landmines.
-   **Winning**: You win by capturing the enemy Flag or if your opponent has no legal moves left.
-   **Losing**: You lose if your Flag is captured or if you have no legal moves on your turn.
