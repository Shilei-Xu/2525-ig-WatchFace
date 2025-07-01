const { Engine, Render, World, Bodies, Body, Events, Svg } = Matter;

const width = 960, height = 960;
const engine = Engine.create();
engine.world.gravity.y = 0.3;

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

const thickness = 50;
World.add(engine.world, [
  Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true }),
  Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true }),
]);

// 修改 createRandomShape，绑定 shapeType
function createRandomShape(x, y) {
  const size = 50 + Math.random() * 2;
  const options = {
    restitution: 0.5,
    friction: 0,
    frictionAir: 0.02,
    mass: 0.05,
    render: { fillStyle: 'white' }
  };
  const typeRand = Math.random();
  let body, shapeType;
  if (typeRand < 0.33) {
    body = Bodies.circle(x, y, size / 2, options);
    shapeType = 'circle';
  } else if (typeRand < 0.66) {
    body = Bodies.rectangle(x, y, size, size, options);
    shapeType = 'rectangle';
  } else {
    // 三角形或五边形随机
    const sides = Math.random() < 0.5 ? 3 : 5;
    body = Bodies.polygon(x, y, sides, size / 2, options);
    shapeType = sides === 3 ? 'triangle' : 'pentagon';
  }
  body.shapeType = shapeType;
  return body;
}

const particles = [];
const quadrantAreas = [
  { xMin: 0, xMax: 480, yMin: -100, yMax: -10 },
  { xMin: 480, xMax: 960, yMin: -100, yMax: -10 },
  { xMin: 0, xMax: 480, yMin: -100, yMax: -10 },
  { xMin: 480, xMax: 960, yMin: -100, yMax: -10 }
];

for (let i = 0; i < 200; i++) {
  const q = i % 4;
  const area = quadrantAreas[q];
  const x = Math.random() * (area.xMax - area.xMin) + area.xMin;
  const y = Math.random() * (area.yMax - area.yMin) + area.yMin;
  const p = createRandomShape(x, y);
  Body.setVelocity(p, { x: 0, y: 0 });
  particles.push(p);
}
World.add(engine.world, particles);

// 新增：分象限保存磁铁路径
let magnetBodies = [];
let magnetSegmentsByQuadrant = [[], [], [], []];
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
  if (!attractOn) return;
  particles.forEach(p => {
    let quadrantIdx;
    switch (p.shapeType) {
      case 'circle': quadrantIdx = 1; break;    // 第一象限，右上
      case 'triangle': quadrantIdx = 0; break;  // 第二象限，左上
      case 'rectangle': quadrantIdx = 2; break; // 第三象限，左下
      case 'pentagon': quadrantIdx = 3; break;  // 第四象限，右下
      default: quadrantIdx = 0;
    }

    const segments = magnetSegmentsByQuadrant[quadrantIdx];
    if (!segments || segments.length === 0) return;

    let closestPoint = null, closestSeg = null, minDistance = Infinity;
    for (const seg of segments) {
      const { distance, point } = distanceToSegment(p.position, seg.p1, seg.p2);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
        closestSeg = seg;
      }
    }
    if (closestPoint && closestSeg) {
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
      const segY = (closestSeg.p1.y + closestSeg.p2.y) / 2;
      const weight = segY < height / 2 ? 1.5 : 1.0;
      const strength = 0.005 * weight * Math.min(1, minDistance / 100);
      Body.applyForce(p, p.position, {
        x: dir.x * strength,
        y: dir.y * strength
      });
    }
  });
});

// 时间数字获取、加载 SVG 不变

async function updateTimeMagnet() {
  const digits = getTimeDigits();
  const positions = [
    { x: 40, y: 0 },    // 第二象限（左上）
    { x: 440, y: 0 },   // 第一象限（右上）
    { x: 40, y: 480 },  // 第三象限（左下）
    { x: 440, y: 480 }  // 第四象限（右下）
  ];

  World.remove(engine.world, magnetBodies);
  magnetBodies = [];
  magnetSegmentsByQuadrant = [[], [], [], []];

  for (let i = 0; i < digits.length; i++) {
    const { vertsList, bodies } = await loadDigitSvg(digits[i], positions[i].x, positions[i].y);
    magnetBodies.push(...bodies);
    for (const verts of vertsList) {
      for (let j = 0; j < verts.length - 1; j++) {
        magnetSegmentsByQuadrant[i].push({ p1: verts[j], p2: verts[j + 1] });
      }
      magnetSegmentsByQuadrant[i].push({ p1: verts[verts.length - 1], p2: verts[0] });
    }
  }

  World.add(engine.world, magnetBodies);
}



// 修改渲染磁铁路径为淡淡蓝色实心
(function renderDebugSegments() {
  Events.on(render, 'afterRender', () => {
    const ctx = render.context;
    ctx.save();
    ctx.fillStyle = 'rgba(100, 150, 255, 0.2)';

    // 遍历四个象限所有路径段绘制
    magnetSegmentsByQuadrant.forEach(segments => {
      segments.forEach(seg => {
        const dx = seg.p2.x - seg.p1.x;
        const dy = seg.p2.y - seg.p1.y;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        ctx.translate(seg.p1.x, seg.p1.y);
        ctx.rotate(angle);
        ctx.fillRect(0, -1.5, length, 18);
        ctx.rotate(-angle);
        ctx.translate(-seg.p1.x, -seg.p1.y);
      });
    });

    ctx.restore();
  });
})();

document.body.addEventListener('click', () => {
  attractOn = !attractOn;
  console.log('吸附开关:', attractOn);
});
