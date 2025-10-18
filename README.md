# Chladni Patterns

> Based on the tutorial: [p5.js Coding Tutorial | Chladni Patterns](https://www.youtube.com/watch?v=J-siGcsK2k8) by [Patt Vira](https://www.pattvira.com/)

An interactive visualization of Chladni patterns using React and p5.js. Chladni patterns are the geometric shapes that form when fine particles settle on the nodal lines of a vibrating surface.

## What are Chladni Patterns?

Named after German physicist Ernst Chladni, these patterns emerge when sand or salt is sprinkled on a vibrating metal plate. The particles naturally move away from areas of high vibration and accumulate on stationary points (nodal lines), creating intricate geometric designs. Different vibration frequencies produce different symmetrical patterns.

## Features

- **10,000 particle simulation** with steering behaviors
- **Interactive pattern generation** - click anywhere to generate new patterns
- **Full-screen visualization** with centered 1:1 aspect ratio
- **Responsive design** - adapts to any screen size
- **Real-time animation** - particles naturally flow toward nodal lines

## How It Works

The visualization uses the cosine-based Chladni equation:

```
f(x,y) = cos(n·π·x/L)·cos(m·π·y/L) - cos(m·π·x/L)·cos(n·π·y/L)
```

Where:
- `m` and `n` determine the number of standing wave segments
- `L` sets the physical size of the plate
- Points where `f(x,y) ≈ 0` are nodal lines

Particles use steering behaviors to seek targets near nodal lines, creating organic movement as they settle into patterns.

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

- **Click anywhere** on the canvas to generate a new random Chladni pattern
- Each pattern uses random `m` and `n` values (1-6) to create unique geometric formations
- Particles will naturally flow and settle onto the nodal lines

## Technologies

- React 19
- p5.js
- Vite
- SCSS

## Credits

Original tutorial and concept by **Patt Vira** ([@pattvira](https://www.pattvira.com/))

## License

MIT
