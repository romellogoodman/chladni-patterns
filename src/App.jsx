import { useRef, useEffect, useState } from "react";
import p5 from "p5";
import "./App.scss";

// ---------------------------------------------------------------------------
// Pattern registry
// Each pattern returns |f(x,y)| in [0..~1] with nodal lines where f = 0.
// Inputs x,y are in [0,1]; m,n are mode numbers and may be fractional so
// morphing between modes is smooth.
// ---------------------------------------------------------------------------
const PI = Math.PI;
const SQRT3_2 = Math.sqrt(3) / 2;

const PATTERNS = [
  // Chladni difference — the original formula
  (x, y, m, n) =>
    Math.abs(
      Math.cos(n * PI * x) * Math.cos(m * PI * y) -
        Math.cos(m * PI * x) * Math.cos(n * PI * y)
    ),
  // Cosine plate (free edge)
  (x, y, m, n) => Math.abs(Math.cos(n * PI * x) * Math.cos(m * PI * y)),
  // Sine membrane (clamped edge)
  (x, y, m, n) => Math.abs(Math.sin(n * PI * x) * Math.sin(m * PI * y)),
  // Superposition of two Chladni figures
  (x, y, m, n) => {
    const a =
      Math.cos(n * PI * x) * Math.cos(m * PI * y) -
      Math.cos(m * PI * x) * Math.cos(n * PI * y);
    const b =
      Math.cos((m + 1) * PI * x) * Math.cos((n + 2) * PI * y) -
      Math.cos((n + 2) * PI * x) * Math.cos((m + 1) * PI * y);
    return Math.abs(0.5 * (a + b));
  },
  // Circular drumhead (Bessel-like stand-in)
  (x, y, m, n) => {
    const cx = (x - 0.5) * 2;
    const cy = (y - 0.5) * 2;
    const r = Math.sqrt(cx * cx + cy * cy);
    if (r > 1) return 0;
    const theta = Math.atan2(cy, cx);
    const radial = Math.cos(m * PI * r) * (1 - 0.3 * r);
    const angular = Math.cos(n * theta);
    return Math.abs(radial * angular);
  },
  // Hexagonal three-wave interference
  (x, y, m, n) => {
    const cx = (x - 0.5) * m * 2 * PI;
    const cy = (y - 0.5) * n * 2 * PI;
    const v =
      Math.cos(cx) +
      Math.cos(cx * 0.5 + cy * SQRT3_2) +
      Math.cos(cx * 0.5 - cy * SQRT3_2);
    return Math.abs(v) / 3;
  },
];

// ---------------------------------------------------------------------------
// Particle
// ---------------------------------------------------------------------------
class Particle {
  constructor(p, w1, w2, h1, h2) {
    this.p = p;
    this.w1 = w1;
    this.w2 = w2;
    this.h1 = h1;
    this.h2 = h2;
    this.position = p.createVector(p.random(w1, w2), p.random(h1, h2));
    this.velocity = p5.Vector.random2D();
    this.acceleration = p.createVector(0, 0);
    this.maxSpeed = 7;
    this.maxForce = 0.5;
    this.target = this.position.copy();
  }

  setBounds(w1, w2, h1, h2) {
    this.w1 = w1;
    this.w2 = w2;
    this.h1 = h1;
    this.h2 = h2;
  }

  // Off-nodal particles get a lightly-jittered target so they keep drifting;
  // on-nodal particles target their own position and coast to a stop. The
  // asymmetry is what leaves a soft cloud everywhere with the figure crisp.
  updateTarget(patternFn, m, n, threshold) {
    const p = this.p;
    const nx = p.map(this.position.x, this.w1, this.w2, 0, 1);
    const ny = p.map(this.position.y, this.h1, this.h2, 0, 1);
    const val = patternFn(nx, ny, m, n);

    this.target = this.position.copy();
    if (val > threshold) {
      this.target.x += p.random(-3, 3);
      this.target.y += p.random(-3, 3);
    }
  }

  update() {
    const desired = p5.Vector.sub(this.target, this.position);
    desired.setMag(this.maxSpeed);
    const steering = p5.Vector.sub(desired, this.velocity);
    steering.limit(this.maxForce);
    this.acceleration.add(steering);

    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);

    if (this.position.x > this.w2) this.position.x = this.w1;
    else if (this.position.x < this.w1) this.position.x = this.w2;
    if (this.position.y > this.h2) this.position.y = this.h1;
    else if (this.position.y < this.h1) this.position.y = this.h2;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p) => {
      const particles = [];
      const numParticles = 22000;
      const margin = 50;
      const threshold = 0.05;
      const minMN = 1;
      const maxMN = 6;

      let w1, w2, h1, h2, squareSize, offsetX, offsetY;

      let patternIdx = 0;
      // current (displayed) m,n ease toward target for smooth morphing
      let curM = 5, curN = 4;
      let tgtM = 5, tgtN = 4;

      let changePattern = true;

      const randomize = () => {
        patternIdx = Math.floor(p.random(PATTERNS.length));
        tgtM = p.random(minMN, maxMN);
        do {
          tgtN = p.random(minMN, maxMN);
        } while (Math.abs(tgtN - tgtM) < 0.4);
        for (const part of particles) {
          part.velocity = p5.Vector.random2D().mult(p.random(2, 5));
        }
      };

      const calculateBounds = () => {
        squareSize = Math.min(p.width, p.height);
        offsetX = (p.width - squareSize) / 2;
        offsetY = (p.height - squareSize) / 2;
        w1 = offsetX + margin;
        w2 = offsetX + squareSize - margin;
        h1 = offsetY + margin;
        h2 = offsetY + squareSize - margin;
      };

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        calculateBounds();
        for (let i = 0; i < numParticles; i++) {
          particles.push(new Particle(p, w1, w2, h1, h2));
        }
        setIsReady(true);
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        calculateBounds();
        for (const part of particles) part.setBounds(w1, w2, h1, h2);
      };

      p.draw = () => {
        p.background(0);

        if (changePattern) {
          randomize();
          changePattern = false;
        }

        // ease toward target m,n so pattern shifts are a morph, not a snap
        curM += (tgtM - curM) * 0.09;
        curN += (tgtN - curN) * 0.09;

        const patternFn = PATTERNS[patternIdx];

        p.stroke(255);
        p.strokeWeight(1);
        p.beginShape(p.POINTS);
        for (let i = 0; i < particles.length; i++) {
          const part = particles[i];
          part.updateTarget(patternFn, curM, curN, threshold);
          part.update();
          p.vertex(part.position.x, part.position.y);
        }
        p.endShape();
      };

      p.mousePressed = () => {
        if (
          p.mouseX >= 0 &&
          p.mouseX <= p.width &&
          p.mouseY >= 0 &&
          p.mouseY <= p.height
        ) {
          changePattern = true;
        }
      };
    };

    const instance = new p5(sketch, canvasRef.current);
    return () => instance.remove();
  }, []);

  return (
    <main className="app" ref={canvasRef}>
      {!isReady && <div className="app__loading">Loading…</div>}
    </main>
  );
}

export default App;
