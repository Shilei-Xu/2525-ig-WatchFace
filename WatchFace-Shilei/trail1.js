let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;

let engine, world;
let particles = [];

function setup() {
  createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 1; // gravity

  background(100); // gray background
}

function draw() {
  background(100);

  Engine.update(engine);

  // upload and display all circle particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    p.show();

    // move very small or out-of-bounds particles
    if (p.r < 2 || p.body.position.y > height + 100) {
      World.remove(world, p.body);
      particles.splice(i, 1);
    }
  }
}

function mouseDragged() {
  // new circle particle on mouse drag
  let p = new Particle(mouseX, mouseY);
  particles.push(p);
}

class Particle {
  constructor(x, y) {
    this.r = random(20, 30);
    this.opacity = 255;
    this.body = Bodies.circle(x, y, this.r, {
      restitution: 0.3,
      friction: 0.1,
    });
    World.add(world, this.body);
  }

  update() {
    // shrink and fade out
    this.r *= 0.98;
    this.opacity *= 0.96;
  }

  show() {
    let pos = this.body.position;
    push();
    translate(pos.x, pos.y);
    noStroke();
    fill(255, this.opacity);
    stroke(0);
    strokeWeight(1);
    ellipse(0, 0, this.r * 2);
    pop();
  }
}
