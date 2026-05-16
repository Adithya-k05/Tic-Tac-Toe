/**
 * Tic Tac Toe Game Logic
 * Beginner-friendly, well-commented vanilla JavaScript
 */

// --- 1. DOM Elements Selection ---
// Grabbing all necessary elements from the HTML to interact with them
const cells = document.querySelectorAll('.cell');
const board = document.getElementById('board');
const currentPlayerIndicator = document.getElementById('current-player');
const btnRestart = document.getElementById('btn-restart');
const modal = document.getElementById('result-modal');
const resultMessage = document.getElementById('result-message');
const btnPlayAgain = document.getElementById('btn-play-again');

// Mode Buttons
const btn2Player = document.getElementById('btn-2player');
const btn1Player = document.getElementById('btn-1player');

// Score Elements
const scoreXElement = document.getElementById('score-x');
const scoreOElement = document.getElementById('score-o');
const scoreDrawsElement = document.getElementById('score-draws');

// Theme Elements
const themeCheckbox = document.getElementById('checkbox');
const themeText = document.getElementById('theme-text');

// --- 2. Game State Variables ---
// These variables track what's currently happening in the game
let gameBoard = ['', '', '', '', '', '', '', '', '']; // Represents the 9 cells
let currentPlayer = 'X'; // X always starts
let isGameActive = true; // Is the game currently being played?
let isSinglePlayer = false; // By default, 2-player mode

// Winning combinations (indices of the 3x3 grid)
const winningConditions = [
    [0, 1, 2], // Top row
    [3, 4, 5], // Middle row
    [6, 7, 8], // Bottom row
    [0, 3, 6], // Left column
    [1, 4, 7], // Middle column
    [2, 5, 8], // Right column
    [0, 4, 8], // Diagonal from top-left
    [2, 4, 6]  // Diagonal from top-right
];

// Scores State (Attempt to load from Local Storage, otherwise default to 0)
let scores = JSON.parse(localStorage.getItem('ticTacScores')) || { x: 0, o: 0, draws: 0 };
updateScoreDisplay(); // Initial display update

// --- 3. Audio Synthesis (Sound Effects without external files!) ---
// Uses the built-in browser Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'click') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(currentPlayer === 'X' ? 440 : 550, audioCtx.currentTime); // Different pitch for X/O
        oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'win') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'draw') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
    }
}

// --- 4. Core Game Logic Functions ---

/**
 * Handles when a user clicks on a cell
 */
function handleCellClick(event) {
    const clickedCell = event.target;
    // Get the data-index attribute to know which cell was clicked (0-8)
    const cellIndex = parseInt(clickedCell.getAttribute('data-index'));

    // If the cell is already filled or the game is over, ignore the click
    if (gameBoard[cellIndex] !== '' || !isGameActive) {
        return;
    }

    // Process the player's move
    processMove(clickedCell, cellIndex);

    // If it's single player mode and the game is still active, make the AI move
    if (isSinglePlayer && isGameActive && currentPlayer === 'O') {
        // Add a slight delay for realism
        setTimeout(makeAIMove, 500);
    }
}

/**
 * Processes a move (updating state, UI, and checking win)
 */
function processMove(cellElement, index) {
    // 1. Update Game State
    gameBoard[index] = currentPlayer;
    
    // 2. Update UI
    cellElement.textContent = currentPlayer;
    cellElement.classList.add(currentPlayer.toLowerCase()); // Adds 'x' or 'o' class for styling
    playSound('click');

    // 3. Check for Win or Draw
    checkResult();
}

/**
 * AI Logic for Single Player mode (Random placement)
 */
function makeAIMove() {
    if (!isGameActive) return;

    // Find all empty cells
    let emptyCells = [];
    for (let i = 0; i < gameBoard.length; i++) {
        if (gameBoard[i] === '') {
            emptyCells.push(i);
        }
    }

    // Pick a random empty cell
    if (emptyCells.length > 0) {
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        const aiMoveIndex = emptyCells[randomIndex];
        const aiCellElement = document.querySelector(`.cell[data-index="${aiMoveIndex}"]`);
        
        processMove(aiCellElement, aiMoveIndex);
    }
}

/**
 * Checks if the current board state is a win or a draw
 */
function checkResult() {
    let roundWon = false;
    let winningCells = [];

    // Loop through all winning combinations to see if any match
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i]; // E.g., a=0, b=1, c=2 (Top row)
        const valA = gameBoard[a];
        const valB = gameBoard[b];
        const valC = gameBoard[c];

        // If any of the cells in the combination are empty, skip it
        if (valA === '' || valB === '' || valC === '') {
            continue;
        }

        // If all three cells match, we have a winner!
        if (valA === valB && valB === valC) {
            roundWon = true;
            winningCells = [a, b, c];
            break; // Stop checking
        }
    }

    if (roundWon) {
        handleWin(winningCells);
        return;
    }

    // Check for draw (if there are no empty strings left in the gameBoard array)
    const isDraw = !gameBoard.includes('');
    if (isDraw) {
        handleDraw();
        return;
    }

    // If no win and no draw, switch turns
    switchPlayer();
}

/**
 * Handles actions when a player wins
 */
function handleWin(winningCells) {
    isGameActive = false;
    
    // Highlight the winning cells
    winningCells.forEach(index => {
        document.querySelector(`.cell[data-index="${index}"]`).classList.add('win');
    });

    // Update score
    if (currentPlayer === 'X') {
        scores.x++;
    } else {
        scores.o++;
    }
    saveAndDisplayScores();
    playSound('win');

    // Show popup message
    setTimeout(() => {
        resultMessage.innerHTML = `Player <span class="${currentPlayer.toLowerCase()}-turn">${currentPlayer}</span> Wins! 🎉`;
        modal.classList.add('show');
    }, 500); // Wait 0.5s so user can see the winning line
}

/**
 * Handles actions when it's a draw
 */
function handleDraw() {
    isGameActive = false;
    scores.draws++;
    saveAndDisplayScores();
    playSound('draw');

    setTimeout(() => {
        resultMessage.textContent = "It's a Draw! 🤝";
        modal.classList.add('show');
    }, 500);
}

/**
 * Switches the current player
 */
function switchPlayer() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    
    // Update the UI turn indicator
    currentPlayerIndicator.textContent = currentPlayer;
    currentPlayerIndicator.className = currentPlayer.toLowerCase() + '-turn';
}

/**
 * Restarts the game to its initial state
 */
function restartGame() {
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    isGameActive = true;
    
    currentPlayerIndicator.textContent = currentPlayer;
    currentPlayerIndicator.className = 'x-turn';

    // Reset UI cells
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'win');
    });

    modal.classList.remove('show');
}

// --- 5. Helper Functions (Scores & Themes) ---

function saveAndDisplayScores() {
    localStorage.setItem('ticTacScores', JSON.stringify(scores));
    updateScoreDisplay();
}

function updateScoreDisplay() {
    scoreXElement.textContent = scores.x;
    scoreOElement.textContent = scores.o;
    scoreDrawsElement.textContent = scores.draws;
}

// --- 6. Event Listeners Setup ---

// Add click event to all cells
cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
});

// Restart buttons
btnRestart.addEventListener('click', restartGame);
btnPlayAgain.addEventListener('click', restartGame);

// Mode selectors
btn2Player.addEventListener('click', () => {
    isSinglePlayer = false;
    btn2Player.classList.add('active');
    btn1Player.classList.remove('active');
    restartGame(); // Restart game when switching modes
});

btn1Player.addEventListener('click', () => {
    isSinglePlayer = true;
    btn1Player.classList.add('active');
    btn2Player.classList.remove('active');
    restartGame();
});

// Theme switcher (Light/Dark mode)
themeCheckbox.addEventListener('change', function() {
    if (this.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeText.textContent = 'Dark Mode';
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeText.textContent = 'Light Mode';
        localStorage.setItem('theme', 'light');
    }
});

// Check local storage for saved theme on page load
const currentTheme = localStorage.getItem('theme');
if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        themeCheckbox.checked = true;
        themeText.textContent = 'Dark Mode';
    }
}
