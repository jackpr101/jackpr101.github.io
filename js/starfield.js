document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('starfield');
    if (!canvas) {
        return; // Exit if the canvas isn't on this page
    }
    const ctx = canvas.getContext('2d');

    // --- DEBOUNCE HELPER FUNCTION --- (No change from original)
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- CAPABILITY DETECTION --- (No change from original)
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // --- CONFIGURATION --- (No change from original)
    const maxStarSize = 8;
    const minStarSize = 4; 
    const numStars = 3000;
    const minStarSpeed = 0.05;
    const maxStarSpeed = 0.25;
    const parallaxFactor = 50;
    const BRIGHTNESS_CURVE_POWER = 10;
    
    const GENERATION_AREA_MULTIPLIER = isTouchDevice ? 0.8 : 2.3;

    const starColors = ['#FFFFFF', '#B0C4DE', '#F5DEB3', '#FFFFE0', '#ffbbbbff'];
    
    // --- CHANGED: DATA STRUCTURE FOR BATCHING ---
    // Instead of one big array, we now use a Map to group stars by their color.
    // This is the foundation of the batch drawing optimization.
    let starsByColor = new Map();
    starColors.forEach(color => starsByColor.set(color, []));
    
    let mouseX = 0;
    let mouseY = 0;
    // --- ADDED: For Page Visibility API ---
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
        // NOTE: The color is now assigned in initializeStars, not here.
    }
    
    // --- CHANGED: INITIALIZATION FOR BATCHING ---
    function initializeStars() {
        // First, clear all the arrays in our map to start fresh.
        starsByColor.forEach(arr => arr.length = 0);

        // Now, create the stars and put them directly into their correct color group.
        for (let i = 0; i < numStars; i++) {
            const color = starColors[Math.floor(Math.random() * starColors.length)];
            let star = {};
            resetStar(star); // Get the position, size, and speed
            star.z = Math.random() * canvas.parentElement.offsetWidth;
            // Add the fully formed star to the array associated with its color
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
        
        // --- CHANGED: THE BATCH DRAWING LOOP ---
        // Instead of one loop through all stars, we now have an outer loop for each color
        // and an inner loop for the stars of that color. This is the core optimization.
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
                    // Instead of filling immediately, we add the star's shape to the current path.
                    ctx.moveTo(px, py);
                    ctx.arc(px, py, finalSize / 2, 0, Math.PI * 2);
                }
            }
            // After adding all stars of this color to the path, we fill them all in a single command.
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function animate() {
        draw();
        // --- CHANGED: Store the animation frame ID ---
        animationFrameId = requestAnimationFrame(animate);
    }
    
    // --- ADDED: PAGE VISIBILITY API FOR PERFORMANCE ---
    // This pauses the animation when the tab is not visible. It's a standard optimization.
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