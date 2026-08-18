/* =====================================================
   HARIPRASAD MANCHIKATLA — PORTFOLIO JAVASCRIPT
   Lightweight, performant interactions & theme management
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initScrollReveal();
    initStatCounters();
    initMobileNav();
    initActiveNavLinks();
});

/* =====================================================
   THEME TOGGLE (Light / Dark Mode with Persistence)
   ===================================================== */
function initThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;

    const storedTheme = localStorage.getItem('hm_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default to light mode (Apple aesthetic) unless user prefers or set dark
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);

    toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('hm_theme', newTheme);
    });

    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            toggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            `;
            toggleBtn.setAttribute('title', 'Switch to Light Mode');
        } else {
            document.documentElement.removeAttribute('data-theme');
            toggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            `;
            toggleBtn.setAttribute('title', 'Switch to Dark Mode');
        }
    }
}

/* =====================================================
   SCROLL REVEAL (IntersectionObserver)
   ===================================================== */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach(el => observer.observe(el));
}

/* =====================================================
   ANIMATED STAT COUNTERS
   ===================================================== */
function initStatCounters() {
    const statNums = document.querySelectorAll('.stat-num');
    if (!statNums.length) return;

    let animated = false;
    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                statNums.forEach(numEl => {
                    const targetVal = parseFloat(numEl.getAttribute('data-val'));
                    const suffix = numEl.getAttribute('data-suffix') || '';
                    if (isNaN(targetVal)) return;

                    const duration = 1200; // ms
                    const startTime = performance.now();

                    function updateCount(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        
                        // Ease out cubic
                        const easeOut = 1 - Math.pow(1 - progress, 3);
                        const currentVal = Math.floor(targetVal * easeOut);
                        
                        numEl.textContent = currentVal + suffix;

                        if (progress < 1) {
                            requestAnimationFrame(updateCount);
                        } else {
                            numEl.textContent = targetVal + suffix;
                        }
                    }

                    requestAnimationFrame(updateCount);
                });
            }
        });
    }, { threshold: 0.3 });

    const statStrip = document.querySelector('.stat-strip');
    if (statStrip) statObserver.observe(statStrip);
}

/* =====================================================
   MOBILE NAVIGATION DRAWER
   ===================================================== */
function initMobileNav() {
    const burger = document.getElementById('navBurger');
    const mobileNav = document.getElementById('mobileNav');
    const links = document.querySelectorAll('.mob-link');

    if (!burger || !mobileNav) return;

    burger.addEventListener('click', () => {
        mobileNav.classList.toggle('open');
    });

    links.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!mobileNav.contains(e.target) && !burger.contains(e.target)) {
            mobileNav.classList.remove('open');
        }
    });
}

/* =====================================================
   ACTIVE NAV LINK HIGHLIGHT ON SCROLL
   ===================================================== */
function initActiveNavLinks() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    if (!sections.length || !navLinks.length) return;

    window.addEventListener('scroll', () => {
        let current = '';
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.offsetHeight;
            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }, { passive: true });
}
