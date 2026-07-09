/* =========================================
   HARIPRASAD MANCHIKATLA — PORTFOLIO JS
   Scroll animations, counter animation,
   rotating text, nav, 3D tilt cards,
   magnetic buttons, scroll progress
   (3D WebGL background lives in three-scene.js)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initNavbar();
    initMobileNav();
    initCounterAnimation();
    initRotatingText();
    initSmoothScroll();
    initCardSpotlights();
    initTiltCards();
    initMagneticButtons();
    initScrollProgress();
    initHeroParallax();
    initCustomCursor();
});

/* ---------- SCROLL REVEAL ---------- */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger the animation
                const delay = index * 100;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, Math.min(delay, 400));
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => observer.observe(el));
}

/* ---------- NAVBAR ---------- */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const scroll = window.scrollY;

        if (scroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = scroll;
    });

    // Active link highlighting
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 200;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

/* ---------- MOBILE NAV ---------- */
function initMobileNav() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        links.classList.toggle('open');
        toggle.classList.toggle('active');
    });

    // Close on link click
    links.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            links.classList.remove('open');
            toggle.classList.remove('active');
        });
    });
}

/* ---------- COUNTER ANIMATION ---------- */
function initCounterAnimation() {
    const counters = document.querySelectorAll('.metric-value[data-count]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-count'));
                animateCounter(el, target);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el, target) {
    const duration = 1500;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(easeOut * target);

        el.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = target;
        }
    }

    requestAnimationFrame(update);
}

/* ---------- ROTATING TEXT ---------- */
function initRotatingText() {
    const el = document.getElementById('rotatingText');
    if (!el) return;

    const words = [
        'AI systems',
        'LLM pipelines',
        'ML infrastructure',
        'intelligent products',
        'agentic frameworks'
    ];

    let currentIndex = 0;

    setInterval(() => {
        // Fade out
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';

        setTimeout(() => {
            currentIndex = (currentIndex + 1) % words.length;
            el.textContent = words[currentIndex];

            // Fade in
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 300);
    }, 3000);

    // Add transition
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
}

/* ---------- SMOOTH SCROLL ---------- */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80; // navbar height
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({
                    top: top,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* ---------- CARD SPOTLIGHTS ---------- */
function initCardSpotlights() {
    const cards = document.querySelectorAll('.about-card, .project-hero, .case-card, .arch-tier, .innovation-card, .metrics-bar, .timeline-content, .stack-category, .github-card, .philosophy-card, .edu-card, .cert-card, .contact-item');
    
    cards.forEach(card => {
        card.classList.add('spotlight-card');
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

/* ---------- 3D TILT CARDS ---------- */
function initTiltCards() {
    // Skip on touch devices and for users who prefer reduced motion
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cards = document.querySelectorAll(
        '.about-card, .case-card, .innovation-card, .github-card, .philosophy-card, .edu-card, .cert-card, .arch-tier'
    );

    const MAX_TILT = 7; // degrees

    cards.forEach(card => {
        card.classList.add('tilt-card');
        let rafId = null;

        card.addEventListener('mouseenter', () => {
            card.style.transition = 'transform 0.08s linear';
        });

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width - 0.5;
            const py = (e.clientY - rect.top) / rect.height - 0.5;

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                card.style.transform =
                    `perspective(900px) rotateX(${(-py * MAX_TILT).toFixed(2)}deg) rotateY(${(px * MAX_TILT).toFixed(2)}deg) translateZ(8px)`;
            });
        });

        card.addEventListener('mouseleave', () => {
            if (rafId) cancelAnimationFrame(rafId);
            card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
        });
    });
}

/* ---------- MAGNETIC BUTTONS ---------- */
function initMagneticButtons() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}

/* ---------- SCROLL PROGRESS BAR ---------- */
function initScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;

    let ticking = false;
    function update() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const progress = max > 0 ? window.scrollY / max : 0;
        bar.style.transform = `scaleX(${progress})`;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }, { passive: true });
    update();
}

/* ---------- HERO PARALLAX ---------- */
function initHeroParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const heroContent = document.querySelector('.hero-content');
    if (!heroContent) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            const limit = window.innerHeight;
            if (y < limit) {
                heroContent.style.transform = `translateY(${y * 0.25}px)`;
                heroContent.style.opacity = `${1 - (y / limit) * 1.1}`;
            }
            ticking = false;
        });
    }, { passive: true });
}

/* ---------- CUSTOM CURSOR ---------- */
function initCustomCursor() {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    const follower = document.createElement('div');
    follower.className = 'custom-cursor-follower';
    document.body.appendChild(cursor);
    document.body.appendChild(follower);

    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    let followerX = cursorX;
    let followerY = cursorY;

    window.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
        cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
        
        const target = e.target;
        if (target.closest('a') || target.closest('button')) {
            follower.classList.add('hovering');
        } else {
            follower.classList.remove('hovering');
        }
    });

    function animateFollower() {
        followerX += (cursorX - followerX) * 0.15;
        followerY += (cursorY - followerY) * 0.15;
        follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0)`;
        requestAnimationFrame(animateFollower);
    }
    animateFollower();
}



