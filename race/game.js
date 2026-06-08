// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get DOM elements
const timeLeftDisplay = document.getElementById('timeLeft');
const accuracyDisplay = document.getElementById('accuracy');
const roundsCompletedDisplay = document.getElementById('roundsCompleted');
const startButton = document.getElementById('startButton');

// Game variables
let timeLeft = 10;
let accuracy = 100;
let roundProgress = 0;
let totalPoints = 0;
let pointsInside = 0;
let gameInterval;
let shapePath;
let startPointPath;
let gameStarted = false;
let previousPosition = null;
let distanceTraveled = 0;

function initGame() {
    resetGame();
    drawShape();
    canvas.addEventListener('mousemove', onMouseMove);

    startButton.style.display = 'none';
    alert('Move your cursor into the start point to begin!');
}

function resetGame() {
    timeLeft = 10;
    accuracy = 100;
    roundProgress = 0;
    totalPoints = 0;
    pointsInside = 0;
    gameStarted = false;
    previousPosition = null;
    distanceTraveled = 0;
    timeLeftDisplay.textContent = timeLeft;
    accuracyDisplay.textContent = accuracy;
    roundsCompletedDisplay.textContent = roundProgress;
}

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

    // Draw start point
    startPointPath = new Path2D();
    const startAngle = -Math.PI / 2; // Top center
    const startPointRadius = 5;
    const startX = centerX + (outerRadius + innerRadius) / 2 * Math.cos(startAngle);
    const startY = centerY + (outerRadius + innerRadius) / 2 * Math.sin(startAngle);
    startPointPath.arc(startX, startY, startPointRadius, 0, 2 * Math.PI);

    ctx.fillStyle = 'green';
    ctx.fill(startPointPath);
}

function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!gameStarted) {
        if (ctx.isPointInPath(startPointPath, x, y)) {
            startGameTimer();
            gameStarted = true;
            previousPosition = { x, y };
        }
        return;
    }

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

    // Calculate distance traveled for round completion
    if (previousPosition) {
        const dx = x - previousPosition.x;
        const dy = y - previousPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        distanceTraveled += distance;

        // Estimate the circumference of the middle path
        const averageRadius = (200 + 180) / 2;
        const circumference = 2 * Math.PI * averageRadius;

        // Update round progress
        roundProgress = (distanceTraveled / circumference);

        roundsCompletedDisplay.textContent = roundProgress;
        distanceTraveled = 0; // Reset for next round
    }

    previousPosition = { x, y };
    updateAccuracy();
}

function updateAccuracy() {
    accuracy = ((pointsInside / totalPoints) * 100).toFixed(2);
    accuracyDisplay.textContent = accuracy;
}

function startGameTimer() {
    gameInterval = setInterval(() => {
        timeLeft--;
        timeLeftDisplay.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    clearInterval(gameInterval);
    canvas.removeEventListener('mousemove', onMouseMove);
    alert(`Time's up! You completed ${roundProgress} rounds with ${accuracy}% accuracy.`);
    startButton.style.display = 'block';
}

startButton.addEventListener('click', () => {
    initGame();
});
