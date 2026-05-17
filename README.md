# Chladni Patterns

> Based on the tutorial: [p5.js Coding Tutorial | Chladni Patterns](https://www.youtube.com/watch?v=J-siGcsK2k8) by [Patt Vira](https://www.pattvira.com/)

An interactive visualization of Chladni patterns using React and p5.js. Chladni patterns are the geometric shapes that form when fine particles settle on the nodal lines of a vibrating surface.

## What are Chladni Patterns?

Named after German physicist Ernst Chladni, these patterns emerge when sand or salt is sprinkled on a vibrating metal plate. The particles naturally move away from areas of high vibration and accumulate on stationary points (nodal lines), creating intricate geometric designs. Different vibration frequencies produce different symmetrical patterns.

## Features

- **10,000 particle simulation** with steering behaviors
- **Six pattern formulas** — each click picks one at random
- **Smooth morphing** between patterns via fractional mode numbers
- **Full-screen visualization** with centered 1:1 aspect ratio
- **Responsive design** — adapts to any screen size

## How It Works

Each click randomizes both the pattern formula and the mode numbers `(m, n)`. The six formulas, found in the `PATTERNS` array in `src/App.jsx`:

| Formula | Expression |
| --- | --- |
| Chladni (difference) | `\|cos(nπx)·cos(mπy) − cos(mπx)·cos(nπy)\|` |
| Cosine plate (free edge) | `\|cos(nπx)·cos(mπy)\|` |
| Sine membrane (clamped edge) | `\|sin(nπx)·sin(mπy)\|` |
| Superposition | average of two Chladni figures with offset modes |
| Circular drumhead | `cos(mπr)·cos(nθ)` in polar coordinates |
| Hexagonal | sum of three plane waves 60° apart |

In every case, points where the expression is near zero are nodal lines. Particles drift when they are off-nodal (targets get a small random jitter, so inertia carries them around the canvas) and coast to a stop when they land near a nodal line. The asymmetry produces a soft cloud of motion everywhere with the figure emerging crisply inside it.

Mode numbers `(m, n)` are carried as floats and eased toward a new random target over about a second, so switching patterns is a morph rather than a snap.

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### Build

```bash
npm run build
```

## Usage

- **Click anywhere** on the canvas to pick a new pattern
- Each click selects a random formula and random `m`, `n` values in `[1, 6)`
- The previous figure morphs into the new one over ~1 second as `m` and `n` ease toward their targets

## Technologies

- React 19
- p5.js
- Vite
- SCSS

## Credits

Original tutorial and concept by **Patt Vira** ([@pattvira](https://www.pattvira.com/))

## License

MIT
