// gas_simulation.js

const { Engine, Render, World, Bodies, Body, Events } = Matter;

// create engine and renderer
const engine = Engine.create();
engine.world.gravity.y = 0; // cancel gravity

const width = 960, height = 960;
const render = Render.create({
  element: document.body,
  engine,
  options: {
    width, height,
    background: '#000',
    wireframes: false,
    pixelRatio: 1
  }
});
Render.run(render);
Engine.run(engine);

// Create boundary walls
const thickness = 50;
const walls = [
  Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true }),
  Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true })
];
World.add(engine.world, walls);

// Initialize random particles
const PARTICLE_COUNT = 600;
const PARTICLE_RADIUS = 5;
const PARTICLE_SPEED = 2;

let particles = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const x = Math.random() * (width - PARTICLE_RADIUS * 2) + PARTICLE_RADIUS;
  const y = Math.random() * (height - PARTICLE_RADIUS * 2) + PARTICLE_RADIUS;
  const p = Bodies.circle(x, y, PARTICLE_RADIUS, {
    restitution: 1,
    friction: 0,
    frictionAir: 0,
    inertia: Infinity,
    render: { fillStyle: 'rgba(255, 246, 67, 0.91)' }
  });
  World.add(engine.world, p);
  particles.push(p);

  // random initial velocity
  const angle = Math.random() * 2 * Math.PI;
  Body.setVelocity(p, {
    x: Math.cos(angle) * PARTICLE_SPEED,
    y: Math.sin(angle) * PARTICLE_SPEED
  });
  p._initialSpeed = PARTICLE_SPEED;
}

// Adjust particle speed to maintain initial speed
Events.on(engine, 'beforeUpdate', event => {
  if (event.timestamp % 500 < engine.timing.lastDelta) {
    particles.forEach(p => {
      const v = p.velocity;
      const speed = Math.hypot(v.x, v.y);
      const base = p._initialSpeed;
      if (speed > 0 && speed < base) {
        const factor = base / speed;
        Body.setVelocity(p, { x: v.x * factor, y: v.y * factor });
      }
    });
  }
});

new BlocksFromSVG(world, 'line.svg', blocks,
    { isStatic: true, restitution: 0, friction: 0.0, frictionAir: 0 },
    {
      save: false, sample: 10, offset: { x: 0, y: 0 }, done: (added, time, fromCache) => {
        console.log('STATIC', added, time, fromCache)
        Sterne.push(added.Star)
      }
    });

