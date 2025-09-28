// --- AI Training Script using a Genetic Algorithm ---

const fs = require('fs');
const path = require('path');
const GameLogic = require('../common/gameLogic.js');

// --- GA Parameters ---
const POPULATION_SIZE = 20;
const NUM_GENERATIONS = 10;
const MUTATION_RATE = 0.1;
const MUTATION_AMOUNT = 0.2;
const NUM_GAMES_PER_MATCHUP = 2;

/**
 * Generates a random set of weights based on the default weights.
 */
function createRandomWeights() {
    const weights = { ...GameLogic.DEFAULT_AI_WEIGHTS };
    for (const key in weights) {
        weights[key] *= (1 + (Math.random() - 0.5));
    }
    return weights;
}

/**
 * Runs a single headless game between two AIs with given weights.
 * This version uses the faster 'Normal' AI logic for training efficiency.
 */
function runHeadlessGame(weights1, weights2) {
    let board = GameLogic.initBoard();
    let currentPlayer = GameLogic.PLAYERS.RED;
    let turnCount = 0;
    const MAX_TURNS = 200;

    while (turnCount < MAX_TURNS) {
        turnCount++;
        const opponent = (currentPlayer === GameLogic.PLAYERS.RED) ? GameLogic.PLAYERS.BLACK : GameLogic.PLAYERS.RED;

        if (GameLogic.getAllMovesForPlayer(board, currentPlayer).length === 0) {
            return opponent;
        }

        const currentWeights = (currentPlayer === GameLogic.PLAYERS.RED) ? weights1 : weights2;
        // Use the faster Normal AI logic for training, passing the evolving weights.
        const { bestMove } = GameLogic.executeNormalAITurn(board, currentPlayer, opponent, currentWeights);

        if (!bestMove) {
            return opponent;
        }

        const { from, to } = bestMove;
        const attacker = board[from.r][from.c];
        const defender = board[to.r][to.c];

        if (defender) {
            if (defender.type === 'flag') return currentPlayer;
            const combatResult = GameLogic.simulateCombat(attacker, defender);
            board[from.r][from.c] = null;
            if (combatResult.winner === 'attacker') board[to.r][to.c] = attacker;
            else if (combatResult.winner !== 'defender') board[to.r][to.c] = null;
        } else {
            board[to.r][to.c] = attacker;
            board[from.r][from.c] = null;
        }
        currentPlayer = opponent;
    }
    return 'draw';
}

/**
 * Creates a new generation of AI weights through selection, crossover, and mutation.
 */
function evolvePopulation(population) {
    population.sort((a, b) => b.fitness - a.fitness);
    console.log(`  - Best AI of generation had fitness: ${population[0].fitness.toFixed(2)}`);

    const newPopulation = [];
    const eliteCount = Math.floor(POPULATION_SIZE * 0.25);
    for (let i = 0; i < eliteCount; i++) {
        newPopulation.push({ weights: population[i].weights, fitness: 0 });
    }

    const parentPoolSize = Math.floor(POPULATION_SIZE * 0.5);
    while (newPopulation.length < POPULATION_SIZE) {
        const parentA = population[Math.floor(Math.random() * parentPoolSize)];
        const parentB = population[Math.floor(Math.random() * parentPoolSize)];
        const childWeights = { ...parentA.weights };
        const keys = Object.keys(childWeights);
        for (let i = 0; i < keys.length / 2; i++) {
            const key = keys[Math.floor(Math.random() * keys.length)];
            childWeights[key] = parentB.weights[key];
        }
        for (const key in childWeights) {
            if (Math.random() < MUTATION_RATE) {
                childWeights[key] *= (1 + (Math.random() - 0.5) * MUTATION_AMOUNT);
            }
        }
        newPopulation.push({ weights: childWeights, fitness: 0 });
    }
    return newPopulation;
}


/**
 * Main training function
 */
async function train() {
    console.log("--- Starting AI Training using Genetic Algorithm ---");

    let population = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
        population.push({ weights: createRandomWeights(), fitness: 0 });
    }

    for (let gen = 0; gen < NUM_GENERATIONS; gen++) {
        console.log(`\n--- Generation ${gen + 1}/${NUM_GENERATIONS} ---`);
        let matchupCount = 0;
        const totalMatchups = (POPULATION_SIZE * (POPULATION_SIZE - 1)) / 2;

        for (let i = 0; i < POPULATION_SIZE; i++) {
            for (let j = i + 1; j < POPULATION_SIZE; j++) {
                matchupCount++;
                process.stdout.write(`  - Running matchups: ${matchupCount}/${totalMatchups}\r`);

                for(let g = 0; g < NUM_GAMES_PER_MATCHUP; g++) {
                    const player1 = g % 2 === 0 ? population[i] : population[j];
                    const player2 = g % 2 === 0 ? population[j] : population[i];
                    const winner = runHeadlessGame(player1.weights, player2.weights);
                    if (winner === 'red') player1.fitness++;
                    else if (winner === 'black') player2.fitness++;
                }
            }
        }
        process.stdout.write('\n');

        population.forEach(p => {
            p.fitness /= ((POPULATION_SIZE - 1) * NUM_GAMES_PER_MATCHUP);
        });

        population = evolvePopulation(population);
    }

    console.log("\n--- Training Complete ---");
    population.sort((a, b) => b.fitness - a.fitness);
    const champion = population[0];
    const outputPath = path.join(__dirname, 'champion_weights.json');

    console.log("Best AI weights found:");
    console.log(JSON.stringify(champion.weights, null, 2));

    fs.writeFileSync(outputPath, JSON.stringify(champion.weights, null, 2));
    console.log(`\nChampion weights have been saved to: ${outputPath}`);
}

train();