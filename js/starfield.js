document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('starfield');
    if (!canvas) {
        return; // Exit if the canvas isn't on this page
    }
    const ctx = canvas.getContext('2d');

    // --- DEBOUNCE HELPER FUNCTION --- 
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- CAPABILITY DETECTION --- 
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // --- CONFIGURATION --- 
    const maxStarSize = 8;
    const minStarSize = 4; 
    const numStars = 3000;
    const minStarSpeed = 0.05;
    const maxStarSpeed = 0.25;
    const parallaxFactor = 50;
    const BRIGHTNESS_CURVE_POWER = 10;
    
    const GENERATION_AREA_MULTIPLIER = isTouchDevice ? 0.8 : 2.3;

    const starColors = ['#FFFFFF', '#B0C4DE', '#F5DEB3', '#FFFFE0', '#ffbbbbff'];
    
    // --- DATA STRUCTURE FOR BATCHING ---
    // Instead of one big array, a Map is used to group stars by their color.
    // Foundation of the batch drawing optimization.
    let starsByColor = new Map();
    starColors.forEach(color => starsByColor.set(color, []));
    
    let mouseX = 0;
    let mouseY = 0;
    // --- For Page Visibility API ---
    let animationFrameId;

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        initializeStars();
    }

    function resetStar(star) {
        const visualWidth = canvas.parentElement.offsetWidth;
        const visualHeight = canvas.parentElement.offsetHeight;
        
        star.x = (Math.random() - 0.5) * visualWidth * GENERATION_AREA_MULTIPLIER;
        star.y = (Math.random() - 0.5) * visualHeight * GENERATION_AREA_MULTIPLIER;
        star.z = visualWidth;
        star.size = Math.random() * (maxStarSize - minStarSize) + minStarSize;
        star.speed = Math.random() * (maxStarSpeed - minStarSpeed) + minStarSpeed;
    }
    
    // --- INITIALIZATION FOR BATCHING ---
    function initializeStars() {
        // Clears all the arrays in map to start fresh.
        starsByColor.forEach(arr => arr.length = 0);

        // Creates the stars and puts them directly into their correct color group.
        for (let i = 0; i < numStars; i++) {
            const color = starColors[Math.floor(Math.random() * starColors.length)];
            let star = {};
            resetStar(star); // Gets the position, size, and speed
            star.z = Math.random() * canvas.parentElement.offsetWidth;
            // Adds the fully formed star to the array associated with its color
            starsByColor.get(color).push(star);
        }
    }

    window.addEventListener('resize', debounce(resizeCanvas, 250));

    if (!isTouchDevice) {
        window.addEventListener('mousemove', function(event) {
            mouseX = (event.clientX / window.innerWidth) - 0.5;
            mouseY = (event.clientY / window.innerHeight) - 0.5;
        });
    }

    resizeCanvas();

    function draw() {
        const visualWidth = canvas.parentElement.offsetWidth;
        const visualHeight = canvas.parentElement.offsetHeight;
        const vanishingPointX = visualWidth / 2 - (mouseX * parallaxFactor);
        const vanishingPointY = visualHeight / 2 - (mouseY * parallaxFactor);
        
        ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
        ctx.clearRect(0, 0, visualWidth, visualHeight);
        ctx.translate(vanishingPointX, vanishingPointY);
        
        // --- THE BATCH DRAWING LOOP ---
        // Instead of one loop through all stars, there is an outer loop for each color
        // and an inner loop for the stars of that color.
        for (const [color, stars] of starsByColor.entries()) {
            // Set the color ONCE for this entire group of stars.
            ctx.fillStyle = color;
            // Begin a single path for all stars of this color.
            ctx.beginPath();
            // Inner loop to process and draw each star of this color.
            for (let i = 0; i < stars.length; i++) {
                const star = stars[i];
                star.z -= star.speed;
                if (star.z <= 0) { 
                    // When a star resets, we re-assign its core properties.
                    // The color stays the same as it remains in its color group.
                    resetStar(star); 
                }
                
                const k = 128.0 / star.z;
                const px = star.x * k;
                const py = star.y * k;

                if (px >= -vanishingPointX && px <= visualWidth - vanishingPointX && py >= -vanishingPointY && py <= visualHeight - vanishingPointY) {
                    const distanceFactor = (1 - star.z / visualWidth);
                    const finalSize = Math.pow(distanceFactor, BRIGHTNESS_CURVE_POWER) * star.size;
                    const finalAlpha = 0.7 + (distanceFactor * 0.3);

                    ctx.globalAlpha = Math.min(finalAlpha, 1.0);
                    // Instead of filling immediately, the star's shape is added to the current path.
                    ctx.moveTo(px, py);
                    ctx.arc(px, py, finalSize / 2, 0, Math.PI * 2);
                }
            }
            // After adding all stars of this color to the path, they are filled in with a single command.
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function animate() {
        draw();
        // --- Store the animation frame ID ---
        animationFrameId = requestAnimationFrame(animate);
    }
    
    // --- PAGE VISIBILITY API FOR PERFORMANCE ---
    // This pauses the animation when the tab is not visible.
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            cancelAnimationFrame(animationFrameId);
        } else {
            animate();
        }
    });

    // Start the animation
    animate();
});