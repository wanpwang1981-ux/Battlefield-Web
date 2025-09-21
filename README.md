# WebLuzhanqi (網頁版陸軍棋)

一款基於HTML/JS/CSS的兩人對戰網頁陸軍棋遊戲，玩家可以在同一瀏覽器上進行本地對戰或與電腦AI對戰。

---

## 功能

- 本機玩家對戰 (Player vs. Player)
- 玩家對電腦 (Player vs. AI)
- 完整的陸軍棋暗棋規則

---

## 技術棧

- HTML
- CSS
- JavaScript

---

## UI/UX 規劃

遊戲介面將會簡潔明瞭，主要由以下幾個部分組成：

1.  **遊戲模式選擇畫面 (Game Mode Selection Screen)**
    *   這是遊戲開始時的第一個畫面。
    *   提供兩個按鈕：「玩家 vs 玩家」和「玩家 vs 電腦」。
    *   選擇後，此畫面隱藏，遊戲主畫面顯示。

2.  **遊戲主畫面 (Main Game Screen)**
    *   **標題區 (Header Area)**:
        *   顯示遊戲名稱 "陸軍棋"。
        *   包含一個「新遊戲」或「重置」按鈕。
    *   **遊戲狀態區 (Game Status Area)**:
        *   顯示當前狀態，例如：「輪到紅方」、「紅方獲勝」、「輪到玩家移動」等。
    *   **主棋盤區 (Main Board Area)**:
        *   佔據畫面中央的主要位置。
        *   顯示棋盤格線與所有棋子。
        *   玩家將在此區域進行所有操作。
    *   **玩家資訊區 (Player Info Areas)**:
        *   分為「我方/紅方」與「敵方/黑方」。
        *   顯示雙方被吃掉的棋子列表，這對於推斷對方剩餘的棋子非常重要。

---

## 核心流程圖

```mermaid
graph TD
    A[Start] --> B{Game Mode Selection};
    B --> C[Player vs Player];
    B --> D[Player vs AI];

    C --> E[Initialize Game (PvP)];
    D --> F[Initialize Game (PvAI)];

    E --> G[Game Loop Start];
    F --> G;

    G --> H{Current Player's Turn};
    H --> I{Is player Human?};
    I -- Yes --> J[Await Human Input];
    I -- No (AI) --> K[Calculate AI Move];

    J --> L{Validate Move};
    K --> L;

    L -- Valid --> M[Update Game State];
    L -- Invalid --> H;

    M --> N{Is Game Over?};
    N -- Yes --> O[Display Winner & End];
    N -- No --> P[Switch Player];
    P --> H;
```

---

## AI 對手設計

電腦AI將遵循一套簡單的、基於規則的演算法來決定其行動。此設計的目標是建立一個功能性的對手，而非一個高階策略大師。AI的決策過程將在其回合中執行，並且是無狀態的（不會記憶過去的移動或進行多步規劃）。

### AI 行動邏輯 (每回合)

1.  **生成所有可能的移動**:
    *   首先，AI會識別出棋盤上所有屬於自己的棋子。
    *   對於每一個棋子，系統會計算其所有合法的移動。一個「移動」被定義為一個 `(起始位置, 終點位置)` 的組合。

2.  **分類移動**:
    *   所有潛在的移動將被分為兩類：
        *   **攻擊移動**: 終點位置被一個敵方棋子佔據。
        *   **普通移動**: 終點位置是空的。

3.  **決策制定**:
    *   **優先處理攻擊移動**: AI會首先檢查「攻擊移動」列表是否為空。
        *   如果列表不為空，AI將從中**隨機選擇一個**來執行。它不會去評估攻擊的優劣（例如，用低階棋子換高階棋子），只要有攻擊機會就會抓住。
    *   **處理普通移動**: 如果「攻擊移動」列表為空，AI將接著檢查「普通移動」列表。
        *   如果列表不為空，AI將從中**隨機選擇一個**來執行。
    *   **無棋可走**: 如果兩個列表都為空，代表AI已無任何可移動的棋子，遊戲可能已陷入僵局或AI方輸掉。

### 輔助函式概念

為了實現上述邏輯，我們的程式碼中將需要類似以下的函式：
- `getAllPiecesForPlayer(player)`: 回傳屬於特定玩家的所有棋子。
- `getValidMovesForPiece(piece)`: 回傳某個棋子所有可以合法移動到的目標位置。
- `getPieceAt(position)`: 回傳某個座標上的棋子，如果該位置為空則回傳 `null`。
