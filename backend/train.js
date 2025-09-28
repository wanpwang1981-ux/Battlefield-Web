// --- AI Training Script using a Genetic Algorithm ---

const fs = require('fs');
const path = require('path');
const GameLogic = require('../common/gameLogic.js');

// --- GA Parameters ---
// NOTE: Using the 'hard' AI with Minimax makes training MUCH slower.
// These values are set low for testing purposes. Increase them for more thorough training.
const POPULATION_SIZE = 10;
const NUM_GENERATIONS = 5;
const MUTATION_RATE = 0.1; // 10% chance for a weight to mutate
const MUTATION_AMOUNT = 0.2; // Mutate by +/- 20%
const NUM_GAMES_PER_MATCHUP = 2; // Each AI plays against another twice (once as Red, once as Black)

/**
 * Generates a random set of weights based on the default weights.
 */
function createRandomWeights() {
    const weights = { ...GameLogic.DEFAULT_AI_WEIGHTS };
    for (const key in weights) {
        // Randomize weight by +/- 50% of its original value
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
    const MAX_TURNS = 200; // Prevent infinite loops

    while (turnCount < MAX_TURNS) {
        turnCount++;
        const opponent = (currentPlayer === GameLogic.PLAYERS.RED) ? GameLogic.PLAYERS.BLACK : GameLogic.PLAYERS.RED;

        if (GameLogic.getAllMovesForPlayer(board, currentPlayer).length === 0) {
            return opponent; // Current player has no moves, opponent wins
        }

        const currentWeights = (currentPlayer === GameLogic.PLAYERS.RED) ? weights1 : weights2;
        // Use the 'Hard' AI so that the new evaluation function is actually used in the simulation.
        const { bestMove } = GameLogic.executeHardAITurn(board, currentPlayer, currentWeights);

        if (!bestMove) {
            return opponent; // AI detected no moves
        }

        const { from, to } = bestMove;
        const attacker = board[from.r][from.c];
        const defender = board[to.r][to.c];

        if (defender) {
            if (defender.type === 'flag') return currentPlayer; // Attacker wins
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
    return 'draw'; // Max turns reached
}

/**
 * Creates a new generation of AI weights through selection, crossover, and mutation.
 */
function evolvePopulation(population) {
    // Sort population by fitness (win rate) descending
    population.sort((a, b) => b.fitness - a.fitness);

    console.log(`  - Best AI of generation had fitness: ${population[0].fitness.toFixed(2)}`);

    const newPopulation = [];
    // Keep the top 25% (elitism)
    const eliteCount = Math.floor(POPULATION_SIZE * 0.25);
    for (let i = 0; i < eliteCount; i++) {
        newPopulation.push({ weights: population[i].weights, fitness: 0 });
    }

    // Breed the rest of the new population from the top 50%
    const parentPoolSize = Math.floor(POPULATION_SIZE * 0.5);
    while (newPopulation.length < POPULATION_SIZE) {
        const parentA = population[Math.floor(Math.random() * parentPoolSize)];
        const parentB = population[Math.floor(Math.random() * parentPoolSize)];

        const childWeights = { ...parentA.weights };
        // Crossover: take half the genes from parent B
        const keys = Object.keys(childWeights);
        for (let i = 0; i < keys.length / 2; i++) {
            const key = keys[Math.floor(Math.random() * keys.length)];
            childWeights[key] = parentB.weights[key];
        }

        // Mutation
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

    // 1. Create initial population
    let population = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
        population.push({ weights: createRandomWeights(), fitness: 0 });
    }

    // 2. Run through generations
    for (let gen = 0; gen < NUM_GENERATIONS; gen++) {
        console.log(`\n--- Generation ${gen + 1}/${NUM_GENERATIONS} ---`);
        let matchupCount = 0;
        const totalMatchups = (POPULATION_SIZE * (POPULATION_SIZE - 1)) / 2;

        // 3. Run tournament
        for (let i = 0; i < POPULATION_SIZE; i++) {
            for (let j = i + 1; j < POPULATION_SIZE; j++) {
                matchupCount++;
                // Update progress on the same line
                process.stdout.write(`  - Running matchups: ${matchupCount}/${totalMatchups}\r`);

                for(let g = 0; g < NUM_GAMES_PER_MATCHUP; g++) {
                    const player1 = g % 2 === 0 ? population[i] : population[j];
                    const player2 = g % 2 === 0 ? population[j] : population[i];

                    const winner = runHeadlessGame(player1.weights, player2.weights);

                    if (winner === 'red') {
                        player1.fitness++;
                    } else if (winner === 'black') {
                        player2.fitness++;
                    }
                }
            }
        }
        process.stdout.write('\n'); // New line after progress bar is done

        // Calculate win rate (fitness)
        population.forEach(p => {
            p.fitness /= ((POPULATION_SIZE - 1) * NUM_GAMES_PER_MATCHUP);
        });

        // 4. Evolve
        population = evolvePopulation(population);
    }

    // 5. Output the best weights
    console.log("\n--- Training Complete ---");
    // Sort final population one last time
    population.sort((a, b) => b.fitness - a.fitness);
    const champion = population[0];
    const outputPath = path.join(__dirname, 'champion_weights.json');

    console.log("Best AI weights found:");
    console.log(JSON.stringify(champion.weights, null, 2));

    fs.writeFileSync(outputPath, JSON.stringify(champion.weights, null, 2));
    console.log(`\nChampion weights have been saved to: ${outputPath}`);
}

train();