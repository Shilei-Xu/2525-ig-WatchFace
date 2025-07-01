const { Engine, Render, World, Bodies, Body, Events, Svg } = Matter;

// 初始化引擎与渲染器
const width = 960, height = 960;
const engine = Engine.create();
engine.world.gravity.y = 0.3;  // 打开重力，让粒子自由下落

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

// 创建白色随机形状粒子，尺寸更大
function createRandomShape(x, y) {
  const size = 50 + Math.random() * 2; // 半径或边长6~8
  const options = {
    restitution: 0.5,
    friction: 0,
    frictionAir: 0.02,
    mass: 0.05,
    render: { fillStyle: 'white' }
  };
  const type = Math.random();
  if (type < 0.33) return Bodies.circle(x, y, size / 2, options);
  else if (type < 0.66) return Bodies.rectangle(x, y, size, size, options);
  else return Bodies.polygon(x, y, 3 + Math.floor(Math.random() * 3), size / 2, options);
}

// 生成100个粒子，从顶部随机x，y在-100~-10之间，刚体无初速度
const particles = [];
const quadrantAreas = [
  { xMin: 0, xMax: 480, yMin: -100, yMax: -10 },       // 左上
  { xMin: 480, xMax: 960, yMin: -100, yMax: -10 },     // 右上
  { xMin: 0, xMax: 480, yMin: -100, yMax: -10 },       // 左下
  { xMin: 480, xMax: 960, yMin: -100, yMax: -10 }      // 右下
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


// 磁吸逻辑
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
    let closestPoint = null, closestSeg = null, minDistance = Infinity;
    for (const seg of magnetSegments) {
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

// 时间数字获取
function getTimeDigits() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return [...h, ...m];
}

// 加载数字SVG并生成吸附路径
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

// 更新时间磁铁路径
async function updateTimeMagnet() {
  const digits = getTimeDigits();
  const positions = [
    { x: 40, y: 0 },
    { x: 440, y: 0 },
    { x: 40, y: 480 },
    { x: 440, y: 480 }
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
      magnetSegments.push({ p1: verts[verts.length - 1], p2: verts[0] }); // 闭合路径
    }
  }

  World.add(engine.world, magnetBodies);
}

// 点击切换磁铁开关
window.addEventListener('click', async () => {
  if (attractOn) {
    attractOn = false;
    World.remove(engine.world, magnetBodies);
    magnetBodies = [];
    magnetSegments = [];
  } else {
    attractOn = true;
    await updateTimeMagnet();
  }
});

/* (function renderDebugSegments() {
  Events.on(render, 'afterRender', () => {
    const ctx = render.context;
    ctx.save();
    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 1;

    magnetSegments.forEach(seg => {
      ctx.beginPath();
      ctx.moveTo(seg.p1.x, seg.p1.y);
      ctx.lineTo(seg.p2.x, seg.p2.y);
      ctx.stroke();
    });

    ctx.restore();
  });
})();  */

(function renderDebugSegments() {
  Events.on(render, 'afterRender', () => {
    const ctx = render.context;
    ctx.save();
    ctx.fillStyle = 'rgba(100, 150, 255, 0.2)'; // 淡淡的蓝色，带透明度

    magnetSegments.forEach(seg => {
      const dx = seg.p2.x - seg.p1.x;
      const dy = seg.p2.y - seg.p1.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // 将原点移动到起点并旋转坐标系
      ctx.translate(seg.p1.x, seg.p1.y);
      ctx.rotate(angle);

      // 绘制一个细长矩形作为“实心线段”
      ctx.fillRect(0, -1.5, length, 18);  // 高度为 3 像素，实心

      // 还原坐标变换
      ctx.rotate(-angle);
      ctx.translate(-seg.p1.x, -seg.p1.y);
    });

    ctx.restore();
  });
})();
