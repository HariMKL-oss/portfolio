# Hariprasad Manchikatla — Portfolio

Personal portfolio of an AI/ML Engineer, live at [hariprasad-manchikatla.vercel.app](https://hariprasad-manchikatla.vercel.app/).

## Features

- **3D WebGL background** (Three.js) — a neural "AI core" of wireframe icosahedrons, glowing neuron nodes, and orbit rings, surrounded by a 900-particle starfield
- Mouse-parallax camera and scroll-reactive scene (the core drifts up and fades as you scroll)
- 3D tilt cards, magnetic buttons, spotlight hover effects, and a custom cursor
- Scroll progress bar, scroll-reveal animations, animated counters, rotating headline
- Mock AI chat assistant modal
- Respects `prefers-reduced-motion` and falls back gracefully on touch devices / without WebGL

## Stack

Zero-build static site — plain HTML, CSS, and JavaScript with [Three.js](https://threejs.org/) loaded from CDN via an import map.

```
index.html      — markup
styles.css      — design system & styles
script.js       — UI interactions (nav, reveal, tilt, chat modal)
three-scene.js  — 3D WebGL background scene
```

## Run locally

Serve the folder with any static server, e.g.:

```bash
npx serve .
```

(Plain `file://` won't work because `three-scene.js` is an ES module.)
