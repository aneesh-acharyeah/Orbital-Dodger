(() => {
  // DOM Elements
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const speedEl = document.getElementById("speed");
  const pauseBtn = document.getElementById("pauseBtn");
  const overlay = document.getElementById("overlay");
  const touch = document.getElementById("touch");
  const leftZone = touch.querySelector(".left");
  const rightZone = touch.querySelector(".right");

  // Templates
  const menuTemplate = document.getElementById("menu-template");
  const gameOverTemplate = document.getElementById("game-over-template");
  const howToPlayTemplate = document.getElementById("how-to-play-template");

  // Game constants
  const W = canvas.width;
  const H = canvas.height;
  const center = { x: W / 2, y: H / 2 };
  const ORBIT_R = Math.min(W, H) * 0.28;
  const SHIP_R = 10;
  const BEST_KEY = "orbital_dodger_best_v1";

  // Game state
  let running = false;
  let paused = false;
  let angle = -Math.PI / 2; // start at top
  let angVel = 0;
  const angAccel = 0.0028;
  const angDrag = 0.985;
  let inputLeft = false;
  let inputRight = false;
  let asteroids = [];
  let score = 0;
  let time = 0; // frames

  // High score
  let BEST = parseInt(localStorage.getItem(BEST_KEY)) || 0;
  bestEl.textContent = BEST;

  // Stars background
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.6 + 0.4,
    tw: Math.random() * 0.06 + 0.02,
  }));

  // Difficulty scaling
  function difficulty(t) {
    // t in seconds
    const spawn = Math.max(18, 60 - t * 1.4);
    const speed = 1.4 + t * 0.02;
    const multi = 0.06 + Math.min(0.3, t * 0.004);
    return { spawn, speed, multi };
  }

  // Utility
  const rand = (a, b) => a + Math.random() * (b - a);

  // Reset game state
  function reset() {
    angle = -Math.PI / 2;
    angVel = 0;
    asteroids = [];
    score = 0;
    time = 0;
    scoreEl.textContent = "0";
  }

  // Spawn asteroid
  function spawnAsteroid(baseSpeed) {
    const a = rand(-Math.PI, Math.PI);
    const far = Math.max(W, H) * 0.75;
    const x = center.x + Math.cos(a) * far;
    const y = center.y + Math.sin(a) * far;
    const r = rand(9, 20);
    const toC = Math.atan2(center.y - y, center.x - x) + rand(-0.25, 0.25);
    const sp = baseSpeed * rand(0.85, 1.25);
    const vx = Math.cos(toC) * sp;
    const vy = Math.sin(toC) * sp;
    asteroids.push({ x, y, vx, vy, r, glow: rand(6, 22) });
  }

  // Game loop
  function update() {
    if (!running || paused) return;

    time++;
    const seconds = time / 60;

    // Input handling
    if (inputLeft && !inputRight) angVel -= angAccel;
    if (inputRight && !inputLeft) angVel += angAccel;
    angVel *= angDrag;
    angle += angVel;

    // Update difficulty
    const diff = difficulty(seconds);
    speedEl.textContent = (1 + seconds * 0.02).toFixed(1) + "x";

    // Spawn asteroids
    if (time % Math.floor(diff.spawn) === 0) {
      spawnAsteroid(diff.speed);
      if (Math.random() < diff.multi) spawnAsteroid(diff.speed * 1.1);
    }

    // Move asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.x += a.vx;
      a.y += a.vy;
      const dx = a.x - center.x;
      const dy = a.y - center.y;
      if (dx * dx + dy * dy < 36) {
        asteroids.splice(i, 1);
        score++;
        scoreEl.textContent = score;
        continue;
      }
    }

    // Collision detection
    const shipX = center.x + Math.cos(angle) * ORBIT_R;
    const shipY = center.y + Math.sin(angle) * ORBIT_R;
    for (const a of asteroids) {
      const dx = a.x - shipX;
      const dy = a.y - shipY;
      const d2 = dx * dx + dy * dy;
      const R = a.r + SHIP_R * 0.9;
      if (d2 < R * R) {
        return gameOver();
      }
    }

    requestAnimationFrame(render);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    // Stars
    stars.forEach((s) => {
      s.r += Math.sin(time * s.tw) * 0.002;
      ctx.fillStyle = "rgba(200,240,255,0.9)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0.2, s.r), 0, Math.PI * 2);
      ctx.fill();
    });

    // Orbit
    ctx.strokeStyle = "rgba(0,225,255,.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, ORBIT_R, 0, Math.PI * 2);
    ctx.stroke();

    // Planet glow
    const grd = ctx.createRadialGradient(center.x, center.y, 6, center.x, center.y, 38);
    grd.addColorStop(0, "rgba(0,225,255,0.9)");
    grd.addColorStop(1, "rgba(0,225,255,0.0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 40, 0, Math.PI * 2);
    ctx.fill();

    // Asteroids
    asteroids.forEach((a) => {
      ctx.shadowBlur = a.glow;
      ctx.shadowColor = "#ff4d8d";
      ctx.fillStyle = "#ff4d8d";
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Ship
    const shipX = center.x + Math.cos(angle) * ORBIT_R;
    const shipY = center.y + Math.sin(angle) * ORBIT_R;
    const shipAngle = angle + Math.PI / 2;
    ctx.save();
    ctx.translate(shipX, shipY);
    ctx.rotate(shipAngle);
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#00e1ff";
    ctx.fillStyle = "#00e1ff";
    ctx.beginPath();
    ctx.moveTo(0, -SHIP_R);
    ctx.lineTo(SHIP_R * 0.9, SHIP_R);
    ctx.lineTo(-SHIP_R * 0.9, SHIP_R);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Progress bar (visual difficulty)
    ctx.fillStyle = "rgba(255,255,255,.15)";
    ctx.fillRect(W - 130, 10, 120, 6);
    ctx.fillStyle = "rgba(0,225,255,.9)";
    const prog = Math.min(1, seconds / 120); // over 2 minutes
    ctx.fillRect(W - 130, 10, 120 * prog, 6);

    // Continue update loop
    update();
  }

  // Game control
  function start() {
    reset();
    running = true;
    paused = false;
    overlay.style.display = "none";
    requestAnimationFrame(render);
  }

  function gameOver() {
    running = false;
    paused = false;
    BEST = Math.max(BEST, score);
    localStorage.setItem(BEST_KEY, BEST);
    bestEl.textContent = BEST;

    const frag = document.importNode(gameOverTemplate.content, true);
    frag.getElementById("final-score").textContent = score;
    frag.getElementById("final-best").textContent = BEST;

    overlay.innerHTML = "";
    overlay.appendChild(frag);

    overlay.querySelector("#again").onclick = start;
    overlay.querySelector("#home").onclick = showMenu;
    overlay.style.display = "flex";
  }

  function showMenu() {
    const frag = document.importNode(menuTemplate.content, true);
    overlay.innerHTML = "";
    overlay.appendChild(frag);
    overlay.style.display = "flex";

    overlay.getElementById("playBtn").onclick = start;
    overlay.getElementById("howBtn").onclick = showHowToPlay;
  }

  function showHowToPlay() {
    const frag = document.importNode(howToPlayTemplate.content, true);
    overlay.innerHTML = "";
    overlay.appendChild(frag);
    overlay.style.display = "flex";
    overlay.getElementById("back").onclick = showMenu;
  }

  // Input handling
  document.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") inputLeft = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") inputRight = true;
    if (e.code === "KeyP") togglePause();
    if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "KeyP"].includes(e.code)) {
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") inputLeft = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") inputRight = false;
  });

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.textContent = paused ? "▶️ Resume" : "⏸ Pause";
    if (!paused) requestAnimationFrame(render);
  }
  pauseBtn.onclick = togglePause;

  // Touch controls
  function bindZone(el, dir) {
    const down = () => (dir < 0 ? (inputLeft = true) : (inputRight = true));
    const up = () => (dir < 0 ? (inputLeft = false) : (inputRight = false));
    ["pointerdown", "touchstart", "mousedown"].forEach((ev) => el.addEventListener(ev, down));
    ["pointerup", "pointercancel", "touchend", "mouseup", "mouseleave"].forEach((ev) =>
      el.addEventListener(ev, up)
    );
  }
  bindZone(leftZone, -1);
  bindZone(rightZone, 1);

  // Start
  showMenu();
})();
