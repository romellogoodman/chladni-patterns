import { useRef, useEffect, useState } from "react";
import p5 from "p5";
import "./App.scss";

// Particle class for the Chladni pattern visualization
class Particle {
  constructor(p, w1, w2, h1, h2) {
    this.p = p;
    this.w1 = w1;
    this.w2 = w2;
    this.h1 = h1;
    this.h2 = h2;

    // Random position within bounds
    this.position = p.createVector(
      p.random(w1, w2),
      p.random(h1, h2)
    );

    // Random initial velocity
    this.velocity = p5.Vector.random2D();

    // Acceleration starts at zero
    this.acceleration = p.createVector(0, 0);

    // Maximum speed and force for steering
    this.maxSpeed = 4;
    this.maxForce = 0.3;

    // Target position (initially same as position)
    this.target = this.position.copy();
  }

  // Update particle position and velocity
  update() {
    // Apply steering force
    const steering = this.seek();
    this.acceleration.add(steering);

    // Update velocity and position
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);

    // Clear acceleration for next frame
    this.acceleration.mult(0);

    // Handle edge wrapping
    this.edges();
  }

  // Seek behavior - steer towards target
  seek() {
    // Calculate desired velocity
    const desired = p5.Vector.sub(this.target, this.position);
    desired.setMag(this.maxSpeed);

    // Calculate steering force
    const steering = p5.Vector.sub(desired, this.velocity);
    steering.limit(this.maxForce);

    return steering;
  }

  // Wrap around edges
  edges() {
    if (this.position.x > this.w2) {
      this.position.x = this.w1;
    } else if (this.position.x < this.w1) {
      this.position.x = this.w2;
    }

    if (this.position.y > this.h2) {
      this.position.y = this.h1;
    } else if (this.position.y < this.h1) {
      this.position.y = this.h2;
    }
  }

  // Update target based on Chladni pattern
  updateTarget(m, n, L, scale, threshold) {
    const p = this.p;

    // Map position to normalized coordinates
    const x = p.map(this.position.x, this.w1, this.w2, 0, 1) * scale;
    const y = p.map(this.position.y, this.h1, this.h2, 0, 1) * scale;

    // Calculate Chladni pattern value
    const val = Math.abs(
      Math.cos(n * Math.PI * x / L) * Math.cos(m * Math.PI * y / L) -
      Math.cos(m * Math.PI * x / L) * Math.cos(n * Math.PI * y / L)
    );

    // Set target to current position
    this.target = this.position.copy();

    // If not close to nodal line, randomize target slightly
    if (val > threshold) {
      this.target.x += p.random(-3, 3);
      this.target.y += p.random(-3, 3);
    }
  }

  // Display particle
  display() {
    this.p.stroke(255);
    this.p.point(this.position.x, this.position.y);
  }
}

function App() {
  const canvasRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p) => {
      // Simulation variables
      const particles = [];
      const numParticles = 10000;
      const margin = 50;
      let w1, w2, h1, h2;
      let squareSize, offsetX, offsetY;

      // Pattern variables
      let m = 5;
      let n = 4;
      const L = 1;
      const scale = 1;
      const threshold = 0.05;
      const minMN = 1;
      const maxMN = 6;

      let changePattern = true;

      // Random pattern generation
      const randomPatterns = () => {
        // Randomize m and n values
        m = Math.floor(p.random(minMN, maxMN));
        n = Math.floor(p.random(minMN, maxMN));

        // Ensure m and n are different for interesting patterns
        if (m === n) {
          n = Math.floor(p.random(minMN, maxMN));
        }

        // Randomize particle velocities
        for (let i = 0; i < particles.length; i++) {
          particles[i].velocity = p5.Vector.random2D().mult(p.random(2, 5));
        }
      };

      const calculateBounds = () => {
        // Calculate square size based on smaller dimension
        squareSize = Math.min(p.width, p.height);

        // Center the square
        offsetX = (p.width - squareSize) / 2;
        offsetY = (p.height - squareSize) / 2;

        // Calculate boundary margins within the centered square
        w1 = offsetX + margin;
        w2 = offsetX + squareSize - margin;
        h1 = offsetY + margin;
        h2 = offsetY + squareSize - margin;
      };

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);

        // Calculate boundary margins
        calculateBounds();

        // Create particles
        for (let i = 0; i < numParticles; i++) {
          particles.push(new Particle(p, w1, w2, h1, h2));
        }

        setIsReady(true);
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);

        // Recalculate boundaries
        calculateBounds();

        // Update particle boundaries
        for (let i = 0; i < particles.length; i++) {
          particles[i].w1 = w1;
          particles[i].w2 = w2;
          particles[i].h1 = h1;
          particles[i].h2 = h2;
        }
      };

      p.draw = () => {
        p.background(0);

        // Change pattern if needed
        if (changePattern) {
          randomPatterns();
          changePattern = false;
        }

        // Update and display all particles
        for (let i = 0; i < particles.length; i++) {
          particles[i].updateTarget(m, n, L, scale, threshold);
          particles[i].update();
          particles[i].display();
        }
      };

      p.mousePressed = () => {
        // Only trigger pattern change if mouse is within canvas
        if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
          changePattern = true;
        }
      };
    };

    // Create p5 instance
    const p5Instance = new p5(sketch, canvasRef.current);
    p5InstanceRef.current = p5Instance;

    // Cleanup on unmount
    return () => {
      p5Instance.remove();
    };
  }, []);

  return (
    <main className="app" ref={canvasRef}>
      {!isReady && <div className="app__loading">Loading...</div>}
    </main>
  );
}

export default App;
