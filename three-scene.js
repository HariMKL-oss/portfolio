/* =========================================
   HARIPRASAD MANCHIKATLA — 3D BACKGROUND
   Three.js neural particle field + AI core
   (wireframe icosahedron, orbit rings),
   mouse parallax, scroll-reactive motion
   ========================================= */

import * as THREE from 'three';

(() => {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
    } catch (err) {
        // WebGL unavailable — static gradient background remains
        return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030408, 0.011);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 250);
    camera.position.set(0, 0, 36);

    const BLUE = new THREE.Color(0x3b82f6);
    const PURPLE = new THREE.Color(0x8b5cf6);
    const CYAN = new THREE.Color(0x06b6d4);
    const PALETTE = [BLUE, BLUE, PURPLE, CYAN];

    /* ---------- Particle starfield ---------- */
    const COUNT = isMobile ? 350 : 900;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
        // Random point in a spherical shell so the core area stays clear
        const r = 18 + Math.random() * 65;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
        positions[i * 3 + 2] = r * Math.cos(phi);

        const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
        size: 0.28,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }));
    scene.add(stars);

    /* ---------- Neural AI core ---------- */
    const core = new THREE.Group();

    const outerShell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(9, 1),
        new THREE.MeshBasicMaterial({ color: BLUE, wireframe: true, transparent: true, opacity: 0.16 })
    );

    const innerShell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(5.4, 0),
        new THREE.MeshBasicMaterial({ color: PURPLE, wireframe: true, transparent: true, opacity: 0.28 })
    );

    // Glowing "neurons" on the outer shell vertices
    const nodes = new THREE.Points(
        new THREE.IcosahedronGeometry(9, 1),
        new THREE.PointsMaterial({
            color: CYAN,
            size: 0.45,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );

    const ringA = new THREE.Mesh(
        new THREE.TorusGeometry(13, 0.035, 8, 96),
        new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.18 })
    );
    ringA.rotation.x = Math.PI * 0.42;

    const ringB = new THREE.Mesh(
        new THREE.TorusGeometry(16.5, 0.025, 8, 96),
        new THREE.MeshBasicMaterial({ color: PURPLE, transparent: true, opacity: 0.12 })
    );
    ringB.rotation.x = Math.PI * 0.55;
    ringB.rotation.y = Math.PI * 0.2;

    core.add(outerShell, innerShell, nodes, ringA, ringB);
    if (isMobile) core.scale.setScalar(0.65);
    scene.add(core);

    // Remember base opacities so the core can fade out on scroll
    const fadeTargets = core.children.map(child => ({
        material: child.material,
        baseOpacity: child.material.opacity
    }));

    /* ---------- Interaction state ---------- */
    let targetX = 0, targetY = 0;   // normalized mouse
    let mouseX = 0, mouseY = 0;     // eased mouse
    let scrollProgress = 0;         // 0 at top → 1 past one viewport

    window.addEventListener('pointermove', (e) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    function updateScroll() {
        scrollProgress = Math.min(window.scrollY / window.innerHeight, 1);
    }
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (reducedMotion) renderer.render(scene, camera);
    });

    /* ---------- Render loop ---------- */
    const clock = new THREE.Clock();
    let rafId = null;

    function renderFrame() {
        const t = clock.getElapsedTime();

        // Eased mouse parallax on the camera
        mouseX += (targetX - mouseX) * 0.04;
        mouseY += (targetY - mouseY) * 0.04;
        camera.position.x = mouseX * 4;
        camera.position.y = -mouseY * 2.5;
        camera.lookAt(0, 0, 0);

        // Core: slow rotation + breathing pulse, drifts up and fades on scroll
        core.rotation.y = t * 0.12 + mouseX * 0.25;
        core.rotation.x = t * 0.05 + mouseY * 0.15;
        const pulse = 1 + Math.sin(t * 1.3) * 0.04;
        const baseScale = isMobile ? 0.65 : 1;
        core.scale.setScalar(baseScale * pulse * (1 + scrollProgress * 0.25));
        core.position.y = scrollProgress * 16;

        const fade = 1 - scrollProgress;
        fadeTargets.forEach(({ material, baseOpacity }) => {
            material.opacity = baseOpacity * fade;
        });

        ringA.rotation.z = t * 0.2;
        ringB.rotation.z = -t * 0.15;

        // Starfield slowly revolves, speeds up slightly while scrolling
        stars.rotation.y = t * 0.02 + scrollProgress * 0.3;
        stars.rotation.x = scrollProgress * 0.12;

        renderer.render(scene, camera);
    }

    function animate() {
        renderFrame();
        rafId = requestAnimationFrame(animate);
    }

    if (reducedMotion) {
        renderFrame();
    } else {
        animate();
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(rafId);
                rafId = null;
            } else if (!rafId) {
                animate();
            }
        });
    }
})();
