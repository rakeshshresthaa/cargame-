const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Track and car parameters (relative)
let trackY, trackHeight, trackMargin;
const carWidth = 400; // even larger size
const carHeight = 160; // even larger size
let carX, carY, carSpeed;

// Track movement
let trackOffset = 0;
let trackScrollSpeed = 4; // initial speed (px/frame)
const minSpeed = 1;
// To reach 400 km/h: 400 = trackScrollSpeed * 0.1 * 60 * 3.6 => trackScrollSpeed = 400 / (0.1 * 60 * 3.6)
const maxSpeed = Math.round(400 / (0.1 * 60 * 3.6)); // about 19

// Load images
const trackImg = new Image();
trackImg.src = 'track.png';
const carGif = new Image();
carGif.src = 'car-unscreen.gif';

// Load background image
const bgImg = new Image();
bgImg.src = 'bgimg.png';

// Day/Night cycle variables
let dayNightDuration = 60; // seconds for a full cycle (slower)

// Star field for night (unchanged)
const stars = Array.from({length: 80}, () => ({
    x: Math.random(),
    y: Math.random() * 0.5,
    r: Math.random() * 1.2 + 0.5,
    tw: Math.random() * Math.PI * 2
}));

// Background sound
const bgAudio = new Audio('bgmusic.wav');
bgAudio.loop = true;
bgAudio.volume = 0.5;
let bgAudioStarted = false;
function showAudioError(msg) {
    const el = document.getElementById('audioError');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
    console.error(msg);
}
bgAudio.addEventListener('error', () => {
    showAudioError('Audio file not found or cannot be played: sound-.mp3');
});
bgAudio.addEventListener('play', () => {
    console.log('Audio started successfully: sound-.mp3');
    const el = document.getElementById('audioError');
    if (el) el.style.display = 'none';
});
function startBgAudio() {
    if (!bgAudioStarted) {
        bgAudio.play().then(() => {
            console.log('Audio play() resolved');
        }).catch((err) => {
            showAudioError('Audio could not be played: ' + err);
        });
        bgAudioStarted = true;
    }
}
window.addEventListener('keydown', startBgAudio);
window.addEventListener('click', startBgAudio);
window.addEventListener('touchstart', startBgAudio);
console.log('Attempting to load audio from: sound-.mp3');

// Acceleration sound
const accelAudio = new Audio('sound.mp3');
accelAudio.volume = 0.7;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Track uses full width, flush with bottom
    trackMargin = 0;
    trackHeight = Math.floor(canvas.height * 0.2);
    trackY = canvas.height - trackHeight; // flush with bottom
    // Center car horizontally on the track
    carX = (canvas.width - carWidth) / 2;
    // Car sits at the top edge of the road
    carY = trackY - carHeight + 60; // 60px overlap for wheels on road
    carSpeed = Math.max(10, Math.floor(canvas.width * 0.015));
    draw();
}

function drawBackground() {
    // Animate background image horizontally in sync with the road
    let imgHeight = canvas.height;
    let offset = 300; // pixels to push image further down
    let imgY = canvas.height - imgHeight + offset;
    // Day/Night cycle
    const now = Date.now() / 1000;
    const t = (now % dayNightDuration) / dayNightDuration;
    // Sky gradient: day or night only
    // Day: #87ceeb (135,206,235) to #e0f7fa (224,247,250)
    // Night: #232946 (35,41,70) to #181d2f (24,29,47)
    let top, bot;
    if (t < 0.5) { // Day (sun is up)
        top = [135,206,235];
        bot = [224,247,250];
    } else { // Night (moon is up)
        top = [35,41,70];
        bot = [24,29,47];
    }
    // Draw vertical gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, `rgb(${top.map(x=>Math.round(x)).join(',')})`);
    grad.addColorStop(1, `rgb(${bot.map(x=>Math.round(x)).join(',')})`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw background image, moving horizontally
    if (bgImg.complete && bgImg.naturalWidth > 0) {
        let imgWidth = canvas.width;
        let bgOffset = -trackOffset % imgWidth;
        for (let x = bgOffset; x < canvas.width; x += imgWidth) {
            ctx.drawImage(bgImg, x, imgY, imgWidth, imgHeight);
        }
    }

    // Sun and moon follow a semi-circular arc (unchanged)
    const arcRadius = canvas.width * 0.4;
    const arcCenterX = canvas.width / 2;
    const arcCenterY = canvas.height * 0.18 + arcRadius * 0.5;
    let tSun = Math.min(t * 2, 1);
    let tMoon = Math.max((t - 0.5) * 2, 0);
    if (t < 0.5) {
        let angle = Math.PI - tSun * Math.PI;
        let sunX = arcCenterX + arcRadius * Math.cos(angle);
        let sunY = arcCenterY - arcRadius * Math.sin(angle);
        ctx.save();
        ctx.globalAlpha = 0.95;
        let gradSun = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 60);
        gradSun.addColorStop(0, 'rgba(255,255,180,1)');
        gradSun.addColorStop(0.5, 'rgba(255,220,80,0.7)');
        gradSun.addColorStop(1, 'rgba(255,220,80,0)');
        ctx.beginPath();
        ctx.arc(sunX, sunY, 48, 0, 2 * Math.PI);
        ctx.fillStyle = gradSun;
        ctx.shadowColor = 'yellow';
        ctx.shadowBlur = 60;
        ctx.fill();
        ctx.restore();
    }
    if (t >= 0.5) {
        let angle = Math.PI - tMoon * Math.PI;
        let moonX = arcCenterX + arcRadius * Math.cos(angle);
        let moonY = arcCenterY - arcRadius * Math.sin(angle);
        ctx.save();
        ctx.globalAlpha = 0.96;
        // Main moon body (pure white)
        let gradMoon = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 40);
        gradMoon.addColorStop(0, '#fff');
        gradMoon.addColorStop(0.7, '#fff');
        gradMoon.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(moonX, moonY, 36, 0, 2 * Math.PI);
        ctx.fillStyle = gradMoon;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 50;
        ctx.fill();
        // Crescent: overlay a dark circle for realism
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(moonX + 16, moonY - 6, 32, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
        // Draw stars
        ctx.save();
        for (let s of stars) {
            let tw = 0.7 + 0.3 * Math.sin(now * 2 + s.tw);
            ctx.globalAlpha = tw * 0.8;
            ctx.beginPath();
            ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
        ctx.restore();
    }
}

function drawTrack() {
    if (trackImg.complete && trackImg.naturalWidth > 0) {
        // Animate horizontal movement by looping the image
        let imgWidth = trackHeight * (trackImg.naturalWidth / trackImg.naturalHeight); // keep aspect ratio
        let x = trackMargin - trackOffset;
        while (x < canvas.width) {
            ctx.drawImage(trackImg, x, trackY, imgWidth, trackHeight);
            x += imgWidth;
        }
        // Draw extra image at the end if needed for seamless loop
        if (trackOffset > 0) {
            ctx.drawImage(trackImg, x, trackY, imgWidth, trackHeight);
        }
    } else {
        ctx.fillStyle = '#888';
        ctx.fillRect(trackMargin, trackY, canvas.width - 2 * trackMargin, trackHeight);
    }
}

function drawCar() {
    // Draw car GIF
    if (carGif.complete && carGif.naturalWidth > 0) {
        ctx.drawImage(carGif, carX, carY, carWidth, carHeight);
    } else {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(carX, carY, carWidth, carHeight);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawTrack();
    drawCar();
    // Show car speed at top left in km/h
    const pxPerFrameToKmh = trackScrollSpeed * 0.1 * 60 * 3.6; // 1 px = 0.1m, 60fps
    ctx.save();
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 4;
    ctx.strokeText(`Speed: ${pxPerFrameToKmh.toFixed(0)} km/h`, 32, 48);
    ctx.fillText(`Speed: ${pxPerFrameToKmh.toFixed(0)} km/h`, 32, 48);
    ctx.restore();
}

function animate() {
    if (trackImg.complete && trackImg.naturalWidth > 0) {
        let imgWidth = trackHeight * (trackImg.naturalWidth / trackImg.naturalHeight);
        trackOffset += trackScrollSpeed;
        if (trackOffset >= imgWidth) trackOffset = 0;
    }
    draw();
    requestAnimationFrame(animate);
}

trackImg.onload = draw;
carGif.onload = draw;

window.addEventListener('resize', resize);
let accelerating = false;

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
        if (!accelerating) {
            trackScrollSpeed = Math.min(maxSpeed, trackScrollSpeed + 1);
            // Play acceleration sound
            try {
                accelAudio.currentTime = 0;
                accelAudio.play();
            } catch (err) {}
            accelerating = true;
            draw();
        }
    } else if (e.key === 'ArrowLeft') {
        trackScrollSpeed = Math.max(minSpeed, trackScrollSpeed - 1);
        draw();
    }
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight') {
        accelAudio.pause();
        accelAudio.currentTime = 0;
        accelerating = false;
    }
});
window.addEventListener('DOMContentLoaded', () => {
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            bgAudio.muted = !bgAudio.muted;
            soundBtn.textContent = bgAudio.muted ? '🔇' : '🔊';
        });
        // Set initial icon
        soundBtn.textContent = bgAudio.muted ? '🔇' : '🔊';
    }
});
resize();

animate(); 