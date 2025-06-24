const { Engine, Render, World, Bodies, Body, Events, Svg } = Matter;

// 初始化引擎与渲染器
const width = 960, height = 960;
const engine = Engine.create();
engine.world.gravity.y = 0;

const render = Render.create({
  element: document.body,
  engine,
  options: {
    width,
    height,
    wireframes: false,
    background: '#000'
  }
});
Render.run(render);
Matter.Runner.run(engine);

// 边界
const thickness = 50;
World.add(engine.world, [
  Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true }),
  Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true }),
]);

// 创建动态白色随机刚体
function createRandomShape(x, y) {
  const size = 4 + Math.random() * 2;
  const type = Math.random();
  const options = {
    restitution: 1,
    friction: 0,
    frictionAir: 0,
    inertia: Infinity,
    render: {
      fillStyle: 'white'
    }
  };
  if (type < 0.33) return Bodies.circle(x, y, size / 2, options);
  else if (type < 0.66) return Bodies.rectangle(x, y, size, size, options);
  else return Bodies.polygon(x, y, 3 + Math.floor(Math.random() * 3), size / 2, options);
}

// 生成粒子刚体
const particles = [];
for (let i = 0; i < 3000; i++) {
  const x = Math.random() * (width - 20) + 10;
  const y = Math.random() * (height - 20) + 10;
  const p = createRandomShape(x, y);
  const angle = Math.random() * Math.PI * 2;
  const speed = 3;
  Body.setVelocity(p, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
  p._initialSpeed = speed;
  particles.push(p);
}
World.add(engine.world, particles);

// 能量维持
Events.on(engine, 'beforeUpdate', evt => {
  if (evt.timestamp % 500 < evt.delta) {
    particles.forEach(p => {
      const v = p.velocity;
      const s = Math.hypot(v.x, v.y);
      if (s < p._initialSpeed && s > 0) {
        Body.setVelocity(p, { x: v.x * p._initialSpeed / s, y: v.y * p._initialSpeed / s });
      }
    });
  }
});

// 吸附逻辑
let magnetBodies = [];
let magnetSegments = [];
let attractOn = false;

function distanceToSegment(p, p1, p2) {
  const A = p.x - p1.x, B = p.y - p1.y;
  const C = p2.x - p1.x, D = p2.y - p1.y;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;
  let xx, yy;
  if (param < 0) { xx = p1.x; yy = p1.y; }
  else if (param > 1) { xx = p2.x; yy = p2.y; }
  else {
    xx = p1.x + param * C;
    yy = p1.y + param * D;
  }
  const dx = p.x - xx, dy = p.y - yy;
  return { distance: Math.sqrt(dx * dx + dy * dy), point: { x: xx, y: yy } };
}

Events.on(engine, 'beforeUpdate', () => {
  if (!attractOn || magnetSegments.length === 0) return;
  particles.forEach(p => {
    let closestPoint = null, minDistance = Infinity;
    for (const seg of magnetSegments) {
      const { distance, point } = distanceToSegment(p.position, seg.p1, seg.p2);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    }
    if (closestPoint) {
      const dir = {
        x: closestPoint.x - p.position.x,
        y: closestPoint.y - p.position.y
      };
      const len = Math.hypot(dir.x, dir.y);
      if (len > 0) {
        dir.x /= len;
        dir.y /= len;
      }
      const speed = Math.hypot(p.velocity.x, p.velocity.y);
      if (speed > 2) {
        Body.setVelocity(p, {
          x: p.velocity.x * 0.95,
          y: p.velocity.y * 0.95
        });
      }
      const strength = 0.0008 * Math.min(1, minDistance / 100);
      Body.applyForce(p, p.position, {
        x: dir.x * strength,
        y: dir.y * strength
      });
    }
  });
});

// 获取时间数字
function getTimeDigits() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return [...h, ...m];
}

// 加载 SVG 并生成吸附线段
async function loadDigitSvg(digit, offsetX, offsetY) {
  const response = await fetch(`${digit}.svg`);
  const svgText = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const paths = doc.querySelectorAll('path');

  const allVerts = [];
  const allBodies = [];

  paths.forEach(path => {
    const verts = Svg.pathToVertices(path, 10);
    const adjustedVerts = verts.map(v => ({ x: v.x + offsetX, y: v.y + offsetY }));
    allVerts.push(adjustedVerts);

    const body = Bodies.fromVertices(offsetX, offsetY, adjustedVerts, {
      isStatic: true,
      render: { fillStyle: 'transparent', strokeStyle: 'transparent' }
    }, true);
    if (body) allBodies.push(body);
  });

  return {
    vertsList: allVerts,
    bodies: allBodies
  };
}

// 创建时间吸附路径
async function updateTimeMagnet() {
  const digits = getTimeDigits();
  const positions = [
    { x: 0, y: 0 },
    { x: 480, y: 0 },
    { x: 0, y: 480 },
    { x: 480, y: 480 }
  ];

  World.remove(engine.world, magnetBodies);
  magnetBodies = [];
  magnetSegments = [];

  for (let i = 0; i < digits.length; i++) {
    const { vertsList, bodies } = await loadDigitSvg(digits[i], positions[i].x, positions[i].y);
    magnetBodies.push(...bodies);
    for (const verts of vertsList) {
      for (let j = 0; j < verts.length - 1; j++) {
        magnetSegments.push({ p1: verts[j], p2: verts[j + 1] });
      }
      magnetSegments.push({ p1: verts[verts.length - 1], p2: verts[0] }); // 闭合
    }
  }

  World.add(engine.world, magnetBodies);
}

// 点击切换吸附
window.addEventListener('click', async () => {
  if (attractOn) {
    attractOn = false;
    World.remove(engine.world, magnetBodies);
    magnetBodies = [];
    magnetSegments = [];
    particles.forEach(p => {
      const ang = Math.random() * Math.PI * 2;
      Body.setVelocity(p, {
        x: Math.cos(ang) * p._initialSpeed,
        y: Math.sin(ang) * p._initialSpeed
      });
    });
  } else {
    attractOn = true;
    await updateTimeMagnet();
  }
});
