const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER, WIN
let score = 0;
let loveMeter = 0;
let lives = 3;
let animationId;
let lastTime = 0;

// Config
const WIN_SCORE = 100;
const SPAWN_RATE = 1000; // ms
let nextSpawnTime = 0;

// Entities
const player = {
    x: 0,
    y: 0,
    width: 80,
    height: 80,
    speed: 10, // Increased speed for snappier movement
    dx: 0,
    image: null
};

let hearts = [];
let particles = [];

// Assets
const basketImg = new Image();
basketImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10,40 Q20,80 50,90 Q80,80 90,40 L10,40 Z" fill="%238B4513" /><path d="M15,40 Q50,10 85,40" fill="none" stroke="%238B4513" stroke-width="5" /></svg>'; 
// Simple SVG basket placeholder

const heartImg = new Image();
heartImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff4757"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

// Input Handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false
};

// Touch Handling
let touchX = null;

// Audio (Optional Placeholder - browser might block auto audio context)
// We'll stick to visual feedback mostly.

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    player.y = canvas.height - player.height - 20;
    // Keep player in bounds if resize happens
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
}

function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // Keyboard Events
    window.addEventListener('keydown', e => {
        if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
    });
    window.addEventListener('keyup', e => {
        if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
    });

    // Touch Events
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        touchX = e.touches[0].clientX;
    }, {passive: false});
    
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        touchX = e.touches[0].clientX;
    }, {passive: false});

    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        touchX = null;
    });

    // Button Listeners
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('replay-btn').addEventListener('click', startGame);

    player.x = canvas.width / 2 - player.width / 2;
    // Start Loop just to render background or wait
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    loveMeter = 0;
    lives = 3;
    hearts = [];
    particles = [];
    player.x = canvas.width / 2 - player.width / 2;
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    document.getElementById('score-board').classList.remove('hidden');
    
    // Update UI
    updateUI();
    
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function updateUI() {
    document.getElementById('score').innerText = Math.floor(loveMeter);
    let heartsDisplay = '';
    for(let i=0; i<lives; i++) heartsDisplay += '❤️';
    document.getElementById('health-display').innerText = heartsDisplay;
}

function spawnHeart() {
    const size = 30 + Math.random() * 20;
    hearts.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        size: size,
        speed: 2 + Math.random() * 3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.05
    });
}

function createParticles(x, y, color) {
    for(let i=0; i<8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1.0,
            color: color
        });
    }
}

function update(dt) {
    if (gameState !== 'PLAYING') return;

    // Player Movement
    if (keys.ArrowLeft) {
        player.x -= player.speed;
    }
    if (keys.ArrowRight) {
        player.x += player.speed;
    }

    // Touch Movement (follow finger)
    if (touchX !== null) {
        const targetX = touchX - player.width/2;
        // Simple lerp for smoothness
        player.x += (targetX - player.x) * 0.2;
    }

    // Boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Spawning
    if (performance.now() > nextSpawnTime) {
        spawnHeart();
        nextSpawnTime = performance.now() + SPAWN_RATE - (loveMeter * 5); // Gets faster as you progress
    }

    // Hearts Logic
    for (let i = hearts.length - 1; i >= 0; i--) {
        let h = hearts[i];
        h.y += h.speed;
        h.x += Math.sin(h.wobble) * 1; // Slight swaying
        h.wobble += h.wobbleSpeed;

        // Collision with Player
        if (
            h.x < player.x + player.width &&
            h.x + h.size > player.x &&
            h.y < player.y + player.height &&
            h.y + h.size > player.y + 20 // +20 ensures we catch it *in* the basket roughly
        ) {
            // Caught!
            createParticles(h.x + h.size/2, h.y + h.size/2, '#ff4757');
            hearts.splice(i, 1);
            loveMeter += 5; // 20 hearts to win
            if (loveMeter >= WIN_SCORE) {
                gameWin();
            }
            updateUI();
            continue;
        }

        // Missed (Fell off screen)
        if (h.y > canvas.height) {
            hearts.splice(i, 1);
            lives--;
            updateUI();
            if (lives <= 0) {
                gameOver();
            }
        }
    }

    // Particles Logic
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'PLAYING') {
        // Draw Player (Basket)
        ctx.drawImage(basketImg, player.x, player.y, player.width, player.height);

        // Draw Hearts
        for (let h of hearts) {
            ctx.drawImage(heartImg, h.x, h.y, h.size, h.size);
        }

        // Draw Particles
        for (let p of particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}

function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    update(dt);
    draw();

    if (gameState === 'PLAYING') {
        requestAnimationFrame(loop);
    }
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('score-board').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = `Score: ${Math.floor(loveMeter)}%`;
}

function gameWin() {
    gameState = 'WIN';
    document.getElementById('score-board').classList.add('hidden');
    document.getElementById('win-screen').classList.remove('hidden');
    createConfetti();
}

// Simple confetti effect for win screen
function createConfetti() {
    // Just reuse particle system or canvas for a quick effect if needed,
    // but CSS/HTML overlay is handling the message.
    // We could add some background fireworks here later.
}

// Start
init();
