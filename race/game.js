// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get DOM elements
const timeLeftDisplay = document.getElementById('timeLeft');
const accuracyDisplay = document.getElementById('accuracy');
const roundsCompletedDisplay = document.getElementById('roundsCompleted');
const startButton = document.getElementById('startButton');

// Game variables
let timeLeft = 30;
let accuracy = 100;
let roundsCompleted = 0;
let isDrawing = false;
let totalPoints = 0;
let pointsInside = 0;
let gameInterval;
let shapePath;

// Initialize game
function initGame() {
    resetGame();
    drawShape();
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);

    gameInterval = setInterval(() => {
        timeLeft--;
        timeLeftDisplay.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// Reset game variables
function resetGame() {
    timeLeft = 30;
    accuracy = 100;
    roundsCompleted = 0;
    totalPoints = 0;
    pointsInside = 0;
    timeLeftDisplay.textContent = timeLeft;
    accuracyDisplay.textContent = accuracy;
    roundsCompletedDisplay.textContent = roundsCompleted;
}

// Draw the ribbon shape
function drawShape() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapePath = new Path2D();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const outerRadius = 200;
    const innerRadius = 180;

    // Draw outer circle
    shapePath.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI, false);
    // Draw inner circle (counter-clockwise)
    shapePath.arc(centerX, centerY, innerRadius, 2 * Math.PI, 0, true);

    ctx.fillStyle = 'lightblue';
    ctx.fill(shapePath);
}

// Mouse move event handler
function onMouseMove(event) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    totalPoints++;

    if (ctx.isPointInPath(shapePath, x, y)) {
        pointsInside++;
        // Draw a small dot to show the tracing
        ctx.fillStyle = 'green';
        ctx.fillRect(x, y, 2, 2);
    } else {
        // Draw a small red dot to indicate outside the ribbon
        ctx.fillStyle = 'red';
        ctx.fillRect(x, y, 2, 2);
    }

    updateAccuracy();
}

// Mouse down event handler
function onMouseDown() {
    isDrawing = true;
    totalPoints = 0;
    pointsInside = 0;
}

// Mouse up event handler
function onMouseUp() {
    isDrawing = false;
    if (accuracy >= 80) {
        roundsCompleted++;
        roundsCompletedDisplay.textContent = roundsCompleted;
        alert('Great job! You completed a round.');
    } else {
        alert('Try again! Keep the cursor within the ribbon.');
    }
    accuracy = 100;
    accuracyDisplay.textContent = accuracy;
    drawShape();
}

// Update accuracy display
function updateAccuracy() {
    accuracy = ((pointsInside / totalPoints) * 100).toFixed(2);
    accuracyDisplay.textContent = accuracy;
}

// End the game
function endGame() {
    clearInterval(gameInterval);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mouseup', onMouseUp);
    alert(`Game Over! You completed ${roundsCompleted} rounds.`);
}

// Start button event listener
startButton.addEventListener('click', () => {
    initGame();
    startButton.style.display = 'none';
});
