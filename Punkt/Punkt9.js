const { Engine, Render, World, Bodies, Body, Events, Svg, Runner } = Matter;

// 基本设置
const width = 960, height = 960;
const engine = Engine.create();
engine.world.gravity.y = 0.2;

// 创建渲染器
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
Runner.run(engine);

// 边界
const thickness = 50;
World.add(engine.world, [
  Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true }),
  Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true }),
]);

// 粒子
const particles = [];
for (let i = 0; i < 1000; i++) {
  const p = Bodies.circle(
    Math.random() * width,
    Math.random() * height,
    3,
    {
      frictionAir: 0.02,
      restitution: 0.5,
      inertia: Infinity,
      render: { fillStyle: 'rgba(200, 220, 255, 0.8)' }
    }
  );
  p._initialSpeed = 2;
  Body.setVelocity(p, {
    x: (Math.random() - 0.5) * 0.5,
    y: Math.random() * 1
  });
  particles.push(p);
}
World.add(engine.world, particles);

// 时间数字 & 吸附设置
let magnetBodies = [];
let magnetSegments = [];
let attractOn = false;

// 工具函数：点到线段距离
function distanceToSegment(p, p1, p2) {
  const A = p.x - p1.x;
  const B = p.y - p1.y;
  const C = p2.x - p1.x;
  const D = p2.y - p1.y;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = len_sq !== 0 ? dot / len_sq : -1;
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

// 吸附行为
Events.on(engine, 'beforeUpdate', () => {
  if (attractOn && magnetSegments.length > 0) {
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
        const strength = 0.001 * Math.min(1, minDistance / 100);
        Body.applyForce(p, p.position, {
          x: dir.x * strength,
          y: dir.y * strength
        });
      }
    });
  }

  // 边界修正：回到顶部
  particles.forEach(p => {
    if (
      p.position.y > height + 50 || p.position.y < -100 ||
      p.position.x < -100 || p.position.x > width + 100
    ) {
      Body.setPosition(p, { x: Math.random() * width, y: -10 });
      Body.setVelocity(p, {
        x: (Math.random() - 0.5) * 1,
        y: Math.random() * 1
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

// 加载 SVG
async function loadDigitSvg(digit, offsetX, offsetY) {
  const response = await fetch(`${digit}.svg`);
  const svgText = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const paths = doc.querySelectorAll('path');

  const allVerts = [], allBodies = [];
  paths.forEach(path => {
    const verts = Svg.pathToVertices(path, 10);
    const adjustedVerts = verts.map(v => ({ x: v.x + offsetX, y: v.y + offsetY }));
    allVerts.push(adjustedVerts);
    const body = Bodies.fromVertices(offsetX, offsetY, adjustedVerts, {
      isStatic: true,
      render: { visible: false }
    }, true);
    if (body) allBodies.push(body);
  });

  return { vertsList: allVerts, bodies: allBodies };
}

// 更新数字吸附形状
async function updateTimeMagnet() {
  const digits = getTimeDigits();
  const positions = [
    { x: 0, y: 0 }, { x: 480, y: 0 },
    { x: 0, y: 480 }, { x: 480, y: 480 }
  ];

  World.remove(engine.world, magnetBodies);
  magnetBodies = [];
  magnetSegments = [];

  for (let i = 0; i < digits.length; i++) {
    const { vertsList, bodies } = await loadDigitSvg(digits[i], positions[i].x, positions[i].y);
    magnetBodies.push(...bodies);
    vertsList.forEach(verts => {
      for (let j = 0; j < verts.length - 1; j++) {
        magnetSegments.push({ p1: verts[j], p2: verts[j + 1] });
      }
      magnetSegments.push({ p1: verts[verts.length - 1], p2: verts[0] });
    });
  }

  World.add(engine.world, magnetBodies);

  // 自动聚焦视图
  const bounds = Matter.Bounds.create(magnetSegments.flatMap(seg => [seg.p1, seg.p2]));
  Render.lookAt(render, {
    min: { x: bounds.min.x - 100, y: bounds.min.y - 100 },
    max: { x: bounds.max.x + 100, y: bounds.max.y + 100 }
  });
}

// 点击切换吸附
window.addEventListener('click', async () => {
  if (attractOn) {
    attractOn = false;
    World.remove(engine.world, magnetBodies);
    magnetBodies = [];
    magnetSegments = [];
    engine.world.gravity.y = 0.2;

    particles.forEach(p => {
      Body.setVelocity(p, {
        x: (Math.random() - 0.5) * 3,
        y: -Math.random() * 6 - 2
      });
    });
  } else {
    attractOn = true;
    engine.world.gravity.y = 0;
    await updateTimeMagnet();
  }
});
