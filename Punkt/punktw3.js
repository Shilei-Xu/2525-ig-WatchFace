const { Engine, Render, World, Bodies, Body, Events, Constraint, Svg } = Matter;

// 画布大小
const width = 960, height = 960;

// 初始化引擎和渲染
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

// 边界
const thickness = 50;
World.add(engine.world, [
  Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true }),
  Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true }),
]);

// ========== 布娃娃刚体和约束 ==========

// 创建布娃娃函数，返回组成部件和手臂刚体方便磁吸用
function createRagdoll(x, y, scale = 1) {
  const group = Body.nextGroup(true);

  const options = {
    collisionFilter: { group },
    render: { fillStyle: 'white' },
    frictionAir: 0.02,
    restitution: 0.1
  };

  // 身体部件
  const head = Bodies.circle(x, y - 60 * scale, 20 * scale, options);
  const chest = Bodies.rectangle(x, y, 40 * scale, 60 * scale, options);

  const leftUpperArm = Bodies.rectangle(x - 35 * scale, y - 20 * scale, 20 * scale, 30 * scale, options);
  const leftLowerArm = Bodies.rectangle(x - 35 * scale, y + 10 * scale, 20 * scale, 30 * scale, options);

  const rightUpperArm = Bodies.rectangle(x + 35 * scale, y - 20 * scale, 20 * scale, 30 * scale, options);
  const rightLowerArm = Bodies.rectangle(x + 35 * scale, y + 10 * scale, 20 * scale, 30 * scale, options);

  const leftUpperLeg = Bodies.rectangle(x - 15 * scale, y + 60 * scale, 20 * scale, 40 * scale, options);
  const leftLowerLeg = Bodies.rectangle(x - 15 * scale, y + 100 * scale, 20 * scale, 40 * scale, options);

  const rightUpperLeg = Bodies.rectangle(x + 15 * scale, y + 60 * scale, 20 * scale, 40 * scale, options);
  const rightLowerLeg = Bodies.rectangle(x + 15 * scale, y + 100 * scale, 20 * scale, 40 * scale, options);

  // 连接刚体的约束（关节）
  const constraints = [
    Constraint.create({ bodyA: head, pointA: { x: 0, y: 20 * scale }, bodyB: chest, pointB: { x: 0, y: -30 * scale }, stiffness: 0.6 }),
    Constraint.create({ bodyA: chest, pointA: { x: -20 * scale, y: -20 * scale }, bodyB: leftUpperArm, pointB: { x: 0, y: -15 * scale }, stiffness: 0.6 }),
    Constraint.create({ bodyA: leftUpperArm, pointA: { x: 0, y: 15 * scale }, bodyB: leftLowerArm, pointB: { x: 0, y: -15 * scale }, stiffness: 0.6 }),
    Constraint.create({ bodyA: chest, pointA: { x: 20 * scale, y: -20 * scale }, bodyB: rightUpperArm, pointB: { x: 0, y: -15 * scale }, stiffness: 0.6 }),
    Constraint.create({ bodyA: rightUpperArm, pointA: { x: 0, y: 15 * scale }, bodyB: rightLowerArm, pointB: { x: 0, y: -15 * scale }, stiffness: 0.6 }),

    Constraint.create({ bodyA: chest, pointA: { x: -15 * scale, y: 30 * scale }, bodyB: leftUpperLeg, pointB: { x: 0, y: -20 * scale }, stiffness: 0.6 }),
    Constraint.create({ bodyA: leftUpperLeg, pointA: { x: 0, y: 20 * scale }, bodyB: leftLowerLeg, pointB: { x: 0, y: -20 * scale }, stiffness: 0.6 }),

    Constraint.create({ bodyA: chest, pointA: { x: 15 * scale, y: 30 * scale }, bodyB: rightUpperLeg, pointB: { x: 0, y: -20 * scale }, stiffness: 0.6 }),
    Constraint.create({ bodyA: rightUpperLeg, pointA: { x: 0, y: 20 * scale }, bodyB: rightLowerLeg, pointB: { x: 0, y: -20 * scale }, stiffness: 0.6 }),
  ];

  const parts = [
    head, chest,
    leftUpperArm, leftLowerArm,
    rightUpperArm, rightLowerArm,
    leftUpperLeg, leftLowerLeg,
    rightUpperLeg, rightLowerLeg
  ];

  return { parts, constraints, leftLowerArm, rightLowerArm };
}

// 创建布娃娃群
const ragdolls = [];
const ragdollCount = 30;
for (let i = 0; i < ragdollCount; i++) {
  const x = Math.random() * (width - 100) + 50;
  const y = Math.random() * -300 - 50;
  const ragdoll = createRagdoll(x, y, 0.4);
  ragdolls.push(ragdoll);
  World.add(engine.world, [...ragdoll.parts, ...ragdoll.constraints]);
}

// ========== 时间数字SVG磁铁路径逻辑 ==========

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

function getTimeDigits() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return [...h, ...m];
}

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

  return { vertsList: allVerts, bodies: allBodies };
}

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
      magnetSegments.push({ p1: verts[verts.length - 1], p2: verts[0] });
    }
  }

  World.add(engine.world, magnetBodies);
}

// 给单个刚体施加磁吸力
function applyMagnetForce(body) {
  if (magnetSegments.length === 0) return;
  let closestPoint = null, minDistance = Infinity;
  for (const seg of magnetSegments) {
    const { distance, point } = distanceToSegment(body.position, seg.p1, seg.p2);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  }
  if (closestPoint) {
    const dir = {
      x: closestPoint.x - body.position.x,
      y: closestPoint.y - body.position.y
    };
    const len = Math.hypot(dir.x, dir.y);
    if (len > 0) {
      dir.x /= len;
      dir.y /= len;
    }
    const strength = 0.0008;
    Body.applyForce(body, body.position, {
      x: dir.x * strength,
      y: dir.y * strength
    });
  }
}

// 引擎帧事件，给布娃娃左右前臂施加磁吸力
Events.on(engine, 'beforeUpdate', () => {
  if (!attractOn) return;
  ragdolls.forEach(ragdoll => {
    applyMagnetForce(ragdoll.leftLowerArm);
    applyMagnetForce(ragdoll.rightLowerArm);
  });
});

// 点击切换磁吸
window.addEventListener('click', () => {
  attractOn = !attractOn;
  if (attractOn) {
    updateTimeMagnet();
  } else {
    World.remove(engine.world, magnetBodies);
    magnetBodies = [];
    magnetSegments = [];
  }
});
