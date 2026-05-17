import { useRef, useEffect, useState } from "react";
import p5 from "p5";
import "./App.scss";

// ---------------------------------------------------------------------------
// Pattern registry
// Each pattern returns |f(x,y)| in [0..~1] with nodal lines where f = 0.
// Inputs x,y are in [0,1]; m,n are the mode numbers (floats allowed, so
// morphing between modes produces smooth transitions).
// ---------------------------------------------------------------------------
const PI = Math.PI;
const SQRT3_2 = Math.sqrt(3) / 2;

const PATTERNS = {
  chladni: {
    label: "Chladni (difference)",
    f: (x, y, m, n) =>
      Math.abs(
        Math.cos(n * PI * x) * Math.cos(m * PI * y) -
          Math.cos(m * PI * x) * Math.cos(n * PI * y)
      ),
  },
  cosine: {
    label: "Cosine plate",
    f: (x, y, m, n) =>
      Math.abs(Math.cos(n * PI * x) * Math.cos(m * PI * y)),
  },
  sine: {
    label: "Sine membrane",
    f: (x, y, m, n) =>
      Math.abs(Math.sin(n * PI * x) * Math.sin(m * PI * y)),
  },
  superposition: {
    label: "Superposition",
    f: (x, y, m, n) => {
      const a =
        Math.cos(n * PI * x) * Math.cos(m * PI * y) -
        Math.cos(m * PI * x) * Math.cos(n * PI * y);
      const b =
        Math.cos((m + 1) * PI * x) * Math.cos((n + 2) * PI * y) -
        Math.cos((n + 2) * PI * x) * Math.cos((m + 1) * PI * y);
      return Math.abs(0.5 * (a + b));
    },
  },
  circular: {
    label: "Circular drum",
    f: (x, y, m, n) => {
      // Re-center to (0.5, 0.5); r in ~[0,1]
      const cx = (x - 0.5) * 2;
      const cy = (y - 0.5) * 2;
      const r = Math.sqrt(cx * cx + cy * cy);
      if (r > 1) return 0;
      const theta = Math.atan2(cy, cx);
      // Bessel-like stand-in: cosine with mild radial decay
      const radial = Math.cos(m * PI * r) * (1 - 0.3 * r);
      const angular = Math.cos(n * theta);
      return Math.abs(radial * angular);
    },
  },
  hexagonal: {
    label: "Hexagonal",
    f: (x, y, m, n) => {
      const cx = (x - 0.5) * m * 2 * PI;
      const cy = (y - 0.5) * n * 2 * PI;
      const v =
        Math.cos(cx) +
        Math.cos(cx * 0.5 + cy * SQRT3_2) +
        Math.cos(cx * 0.5 - cy * SQRT3_2);
      return Math.abs(v) / 3;
    },
  },
};

const PATTERN_KEYS = Object.keys(PATTERNS);

// Small finite-difference gradient of |f| used for steering particles toward
// nodal lines. eps is in normalized [0,1] space.
const EPS = 0.004;
function gradient(f, x, y, m, n) {
  const gx = (f(x + EPS, y, m, n) - f(x - EPS, y, m, n)) / (2 * EPS);
  const gy = (f(x, y + EPS, m, n) - f(x, y - EPS, m, n)) / (2 * EPS);
  return [gx, gy];
}

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
    this.maxSpeed = 4;
    this.maxForce = 0.3;
    this.target = this.position.copy();
    this.fieldVal = 0;
  }

  setBounds(w1, w2, h1, h2) {
    this.w1 = w1;
    this.w2 = w2;
    this.h1 = h1;
    this.h2 = h2;
  }

  // Steer using the gradient of |f|: move opposite the gradient so particles
  // flow *downhill* toward nodal lines. When already near a node the step is
  // small, so lines stay sharp.
  updateTarget(patternFn, m, n, threshold) {
    const p = this.p;
    const nx = p.map(this.position.x, this.w1, this.w2, 0, 1);
    const ny = p.map(this.position.y, this.h1, this.h2, 0, 1);

    const val = patternFn(nx, ny, m, n);
    this.fieldVal = val;

    if (val < threshold) {
      // Close enough — tiny jitter keeps the cloud alive.
      this.target = this.position.copy();
      this.target.x += p.random(-0.4, 0.4);
      this.target.y += p.random(-0.4, 0.4);
      return;
    }

    const [gx, gy] = gradient(patternFn, nx, ny, m, n);
    const gmag = Math.hypot(gx, gy) + 1e-6;
    const stepPx = p.constrain(val * 40, 2, 20);
    // Convert gradient back to pixel space
    const pxW = this.w2 - this.w1;
    const pxH = this.h2 - this.h1;
    this.target = p.createVector(
      this.position.x - (gx / gmag) * stepPx * (pxW / pxH || 1),
      this.position.y - (gy / gmag) * stepPx
    );
  }

  update(maxSpeed) {
    this.maxSpeed = maxSpeed;
    // Seek
    const desired = p5.Vector.sub(this.target, this.position);
    desired.setMag(this.maxSpeed);
    const steering = p5.Vector.sub(desired, this.velocity);
    steering.limit(this.maxForce);
    this.acceleration.add(steering);

    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);

    // Wrap
    if (this.position.x > this.w2) this.position.x = this.w1;
    else if (this.position.x < this.w1) this.position.x = this.w2;
    if (this.position.y > this.h2) this.position.y = this.h1;
    else if (this.position.y < this.h1) this.position.y = this.h2;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const DEFAULTS = {
  pattern: "chladni",
  m: 5,
  n: 4,
  threshold: 0.05,
  particleCount: 12000,
  maxSpeed: 4,
  colorMode: "mono", // mono | velocity | field
  trails: true,
};

const COLOR_MODES = [
  { value: "mono", label: "Mono" },
  { value: "velocity", label: "Velocity" },
  { value: "field", label: "Field" },
];

function App() {
  const canvasRef = useRef(null);
  const p5InstanceRef = useRef(null);

  // settings live in a ref so slider updates don't re-instantiate p5
  const [settings, setSettings] = useState(DEFAULTS);
  const settingsRef = useRef(DEFAULTS);
  settingsRef.current = settings;

  // mutable flags the sketch polls each frame
  const commandsRef = useRef({ randomize: true, saveFrame: false });

  const [isReady, setIsReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const updateSetting = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p) => {
      let particles = [];
      let w1, w2, h1, h2, squareSize, offsetX, offsetY;
      const margin = 40;

      // current (displayed) m,n lerp toward target m,n for smooth morphing
      let curM = DEFAULTS.m;
      let curN = DEFAULTS.n;
      let tgtM = DEFAULTS.m;
      let tgtN = DEFAULTS.n;

      const minMN = 1;
      const maxMN = 6;

      const randomize = () => {
        tgtM = p.random(minMN, maxMN);
        do {
          tgtN = p.random(minMN, maxMN);
        } while (Math.abs(tgtN - tgtM) < 0.4);
        // nudge velocities so particles escape their current basin
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

      const resizeParticles = (target) => {
        while (particles.length < target) {
          particles.push(new Particle(p, w1, w2, h1, h2));
        }
        if (particles.length > target) {
          particles.length = target;
        }
      };

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.HSB, 360, 100, 100, 100);
        calculateBounds();
        resizeParticles(settingsRef.current.particleCount);
        setIsReady(true);
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        calculateBounds();
        for (const part of particles) part.setBounds(w1, w2, h1, h2);
      };

      p.draw = () => {
        const s = settingsRef.current;
        const cmd = commandsRef.current;

        if (cmd.randomize) {
          randomize();
          cmd.randomize = false;
          // also mirror into React state so sliders reflect the new target
          setSettings((prev) => ({ ...prev, m: tgtM, n: tgtN }));
        } else {
          // let slider-driven m,n override the internal target
          tgtM = s.m;
          tgtN = s.n;
        }

        // ease curM,curN toward target
        curM += (tgtM - curM) * 0.04;
        curN += (tgtN - curN) * 0.04;

        // background / trails
        if (s.trails) {
          p.noStroke();
          p.fill(0, 0, 0, 22);
          p.rect(0, 0, p.width, p.height);
        } else {
          p.background(0);
        }

        resizeParticles(s.particleCount);
        const patternFn = (PATTERNS[s.pattern] || PATTERNS.chladni).f;

        // batched points for perf
        p.strokeWeight(1);
        p.beginShape(p.POINTS);
        for (let i = 0; i < particles.length; i++) {
          const part = particles[i];
          part.updateTarget(patternFn, curM, curN, s.threshold);
          part.update(s.maxSpeed);

          let h = 0,
            sat = 0,
            br = 100,
            al = 90;
          if (s.colorMode === "velocity") {
            const speed = part.velocity.mag();
            h = p.map(speed, 0, s.maxSpeed, 200, 20);
            sat = 80;
            al = 80;
          } else if (s.colorMode === "field") {
            h = p.map(part.fieldVal, 0, 1, 280, 40, true);
            sat = 70;
            al = 85;
          }
          p.stroke(h, sat, br, al);
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
          commandsRef.current.randomize = true;
        }
      };
    };

    const instance = new p5(sketch, canvasRef.current);
    p5InstanceRef.current = instance;

    return () => instance.remove();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        commandsRef.current.randomize = true;
      } else if (e.key === "h" || e.key === "H") {
        setPanelOpen((v) => !v);
      } else if (e.key === "s" || e.key === "S") {
        p5InstanceRef.current?.saveCanvas("chladni", "png");
      } else if (e.key === "t" || e.key === "T") {
        setSettings((prev) => ({ ...prev, trails: !prev.trails }));
      } else if (/^[1-6]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (PATTERN_KEYS[idx]) {
          setSettings((prev) => ({ ...prev, pattern: PATTERN_KEYS[idx] }));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click on canvas to randomize is handled inside p5, but stop propagation
  // from panel clicks so they don't also fire a randomize.
  const stopClick = (e) => e.stopPropagation();

  return (
    <main className="app" ref={canvasRef}>
      {!isReady && <div className="app__loading">Loading…</div>}

      <button
        className="app__toggle"
        onClick={(e) => {
          stopClick(e);
          setPanelOpen((v) => !v);
        }}
        onMouseDown={stopClick}
        aria-label="Toggle controls"
      >
        {panelOpen ? "×" : "≡"}
      </button>

      <section
        className={`controls ${panelOpen ? "" : "controls--hidden"}`}
        onClick={stopClick}
        onMouseDown={stopClick}
      >
        <h1 className="controls__title">Chladni</h1>

        <div className="controls__row">
          <label className="controls__label" htmlFor="pattern">
            Pattern
          </label>
          <select
            id="pattern"
            className="controls__select"
            value={settings.pattern}
            onChange={(e) => updateSetting("pattern", e.target.value)}
          >
            {PATTERN_KEYS.map((k, i) => (
              <option key={k} value={k}>
                {i + 1}. {PATTERNS[k].label}
              </option>
            ))}
          </select>
        </div>

        <Slider
          label="m"
          value={settings.m}
          min={1}
          max={8}
          step={0.1}
          onChange={(v) => updateSetting("m", v)}
        />
        <Slider
          label="n"
          value={settings.n}
          min={1}
          max={8}
          step={0.1}
          onChange={(v) => updateSetting("n", v)}
        />
        <Slider
          label="Threshold"
          value={settings.threshold}
          min={0.005}
          max={0.3}
          step={0.005}
          onChange={(v) => updateSetting("threshold", v)}
        />
        <Slider
          label="Particles"
          value={settings.particleCount}
          min={1000}
          max={30000}
          step={500}
          onChange={(v) => updateSetting("particleCount", v)}
          display={(v) => v.toLocaleString()}
        />
        <Slider
          label="Speed"
          value={settings.maxSpeed}
          min={1}
          max={10}
          step={0.5}
          onChange={(v) => updateSetting("maxSpeed", v)}
        />

        <div className="controls__row">
          <label className="controls__label">Color</label>
          <div className="controls__segmented">
            {COLOR_MODES.map((c) => (
              <button
                key={c.value}
                className={`controls__segment ${
                  settings.colorMode === c.value
                    ? "controls__segment--active"
                    : ""
                }`}
                onClick={() => updateSetting("colorMode", c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="controls__row">
          <label className="controls__label" htmlFor="trails">
            Trails
          </label>
          <input
            id="trails"
            type="checkbox"
            checked={settings.trails}
            onChange={(e) => updateSetting("trails", e.target.checked)}
          />
        </div>

        <div className="controls__actions">
          <button
            className="controls__button"
            onClick={() => (commandsRef.current.randomize = true)}
          >
            Randomize (Space)
          </button>
          <button
            className="controls__button"
            onClick={() => p5InstanceRef.current?.saveCanvas("chladni", "png")}
          >
            Save PNG (S)
          </button>
        </div>

        <p className="controls__hint">
          Click the canvas for a new pattern · H hides this panel · 1–6 picks a
          formula · T toggles trails
        </p>
      </section>
    </main>
  );
}

function Slider({ label, value, min, max, step, onChange, display }) {
  return (
    <div className="controls__row controls__row--slider">
      <div className="controls__label-line">
        <span className="controls__label">{label}</span>
        <span className="controls__value">
          {display ? display(value) : Number(value).toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        className="controls__slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default App;
