// svg_particle_magnet_click.js
const { Engine, Render, World, Bodies, Body, Events, Composite, Svg, Vertices } = Matter;

const width = 960, height = 960;
const engine = Engine.create();
engine.world.gravity.y = 0; // 关闭重力

const render = Render.create({
  element: document.body,
  engine,
  options: { width, height, wireframes: false, background: '#000' }
});
Render.run(render);
Engine.run(engine);

// 边界墙
const thickness = 50;
World.add(engine.world, [
  Bodies.rectangle(width/2, -thickness/2, width, thickness, { isStatic: true }),
  Bodies.rectangle(width/2, height+thickness/2, width, thickness, { isStatic: true }),
  Bodies.rectangle(-thickness/2, height/2, thickness, height, { isStatic: true }),
  Bodies.rectangle(width+thickness/2, height/2, thickness, height, { isStatic: true }),
]);

// 粒子
const particles = [];
for (let i=0; i<1200; i++) {
  const p = Bodies.circle(
    Math.random()*(width-20)+10,
    Math.random()*(height-20)+10,
    4,
    { restitution: 1, friction: 0, frictionAir: 0, inertia: Infinity, render: { fillStyle: 'rgba(100,200,255,0.8)' } }
  );
  const ang = Math.random()*2*Math.PI;
  Body.setVelocity(p, { x: Math.cos(ang)*3, y: Math.sin(ang)*3 });
  p._initialSpeed = 3;
  particles.push(p);
}
World.add(engine.world, particles);

// 能量补偿保持稳定运动
Events.on(engine, 'beforeUpdate', evt => {
  if (evt.timestamp % 500 < evt.delta) {
    particles.forEach(p => {
      const v = p.velocity, s = Math.hypot(v.x, v.y);
      if (s < p._initialSpeed && s > 0) {
        Body.setVelocity(p, { x: v.x * p._initialSpeed/s, y: v.y * p._initialSpeed/s });
      }
    });
  }
});

// 磁力逻辑变量
let magnetBodies = [];
let magnetPoints = [];
let attractOn = false;

// 点击加载 SVG 并开启磁性
window.addEventListener('click', () => {
  if (attractOn) return;
  attractOn = true;
  fetch('line.svg').then(r => r.text()).then(svgText => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const paths = doc.querySelectorAll('path');
    magnetBodies.forEach(b=>World.remove(engine.world, b));
    magnetBodies = []; magnetPoints = [];
    paths.forEach(path => {
      const verts = Svg.pathToVertices(path, 10);
      const body = Bodies.fromVertices(0,0, verts, { isStatic: true, render: { fillStyle: 'transparent' } }, true);
      magnetBodies.push(body);
      World.add(engine.world, body);
      magnetPoints.push(...verts);
    });
  });
});


// 吸附行为（更新版）
Events.on(engine, 'beforeUpdate', () => {
  if (!attractOn || magnetPoints.length === 0) return;

  particles.forEach(p => {
    let closest = null, md = Infinity;
    for (let i = 0; i < magnetPoints.length; i++) {
      const pt = magnetPoints[i];
      const dx = pt.x - p.position.x;
      const dy = pt.y - p.position.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < md) {
        md = distSq;
        closest = pt;
      }
    }

    if (closest) {
      const dist = Math.sqrt(md);
      const dir = Matter.Vector.normalise({ x: closest.x - p.position.x, y: closest.y - p.position.y });

      // 限制最大速度，避免贴近后反弹
      const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2);
      if (speed > 2) {
        Body.setVelocity(p, {
          x: p.velocity.x * 0.95,
          y: p.velocity.y * 0.95
        });
      }

      // 应用吸引力（距离越近越弱）
      const strength = 0.0008 * Math.min(1, dist / 100);
      Body.applyForce(p, p.position, {
        x: dir.x * strength,
        y: dir.y * strength
      });
    }
  });
});