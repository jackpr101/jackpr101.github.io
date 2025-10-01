document.addEventListener('DOMContentLoaded', function () {
    const header = document.querySelector('.main-header');

    // We only need to check for the header now.
    if (!header) {
        return;
    }

    // Set a small threshold in pixels. As soon as the user scrolls more than
    // this amount, the header will change. 10 or 20 is a good value.
    const scrollThreshold = 10;

    const handleScroll = () => {
        // The new, simpler condition:
        // Is the vertical scroll position greater than our small threshold?
        if (window.scrollY > scrollThreshold) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    // Listen for scroll events
    window.addEventListener('scroll', handleScroll);

    // Run the function once on page load to set the initial state correctly
    handleScroll();

    // --- Scroll Animation Logic ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, {
        threshold: 0.2 // Trigger when 10% of the element is visible
    });

    const elementsToAnimate = document.querySelectorAll('.animate-on-scroll');
    elementsToAnimate.forEach(el => observer.observe(el));
});