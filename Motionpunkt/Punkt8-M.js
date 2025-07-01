const { Engine, Render, World, Bodies, Body, Events, Svg } = Matter;

// 初始化引擎
const width = 960, height = 960;
const engine = Engine.create();
engine.world.gravity.y = 0;

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
Matter.Runner.run(engine);

// 创建边界
const thickness = 50;
World.add(engine.world, [
  Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true }),
  Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true }),
  Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true }),
]);

// 创建粒子
const particles = [];
for (let i = 0; i < 1500; i++) {
  const p = Bodies.circle(
    Math.random() * (width - 20) + 10,
    Math.random() * (height - 20) + 10,
    4,
    {
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      inertia: Infinity,
      render: { fillStyle: 'rgba(51, 241, 255, 0.8)' }
    }
  );
  // 设置初始速度
  const ang = Math.random() * 2 * Math.PI;
  const speed = 3;
  Body.setVelocity(p, { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed });
  p._initialSpeed = speed;
  particles.push(p);
}
World.add(engine.world, particles);

// 能量补偿
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

// 磁铁效果 
let magnetBodies = [];
let magnetSegments = [];
let attractOn = false;

// 计算点到线段的距离
function distanceToSegment(p, p1, p2) {
  const A = p.x - p1.x;
  const B = p.y - p1.y;
  const C = p2.x - p1.x;
  const D = p2.y - p1.y;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;
  let xx, yy;
  if (param < 0) {
    xx = p1.x; yy = p1.y;
  } else if (param > 1) {
    xx = p2.x; yy = p2.y;
  } else {
    xx = p1.x + param * C;
    yy = p1.y + param * D;
  }
  const dx = p.x - xx;
  const dy = p.y - yy;
  return { distance: Math.sqrt(dx * dx + dy * dy), point: { x: xx, y: yy } };
}

// 吸附事件
Events.on(engine, 'beforeUpdate', () => {
  if (!attractOn || magnetSegments.length === 0) return;
  particles.forEach(p => {
    let closestPoint = null, minDistance = Infinity;
    for (const segment of magnetSegments) {
      const { distance, point } = distanceToSegment(p.position, segment.p1, segment.p2);
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

// 获取当前时间的数字
function getTimeDigits() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return [...h, ...m];
}

// 加载数字SVG并创建磁铁
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

    if (body) {
      allBodies.push(body);
    }
  });

  return {
    vertsList: allVerts,
    bodies: allBodies
  };
}

// 更新磁铁 
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
      magnetSegments.push({ p1: verts[verts.length - 1], p2: verts[0] }); // 闭合线
    }
  }

  World.add(engine.world, magnetBodies);
}

// 点击事件切换磁铁状态
window.addEventListener('click', async () => {
  if (attractOn) {
    attractOn = false;
    World.remove(engine.world, magnetBodies);
    magnetBodies = [];
    magnetSegments = [];
    particles.forEach(p => {
      const angle = Math.random() * 2 * Math.PI;
      Body.setVelocity(p, {
        x: Math.cos(angle) * p._initialSpeed,
        y: Math.sin(angle) * p._initialSpeed
      });
    });
    return;
  }
  attractOn = true;
  await updateTimeMagnet();
});


// 调试
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

// 1. 启用设备重力感应控制粒子方向
/* if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', event => {
    if (!attractOn) return; // 只在吸附开启时响应
    const gamma = event.gamma; // 左右倾斜 [-90, 90]
    const beta = event.beta;   // 前后倾斜 [-180, 180]

    // 映射为重力值，限制范围
    const gx = Math.max(-1, Math.min(1, gamma / 45));
    const gy = Math.max(-1, Math.min(1, beta / 45));

    engine.world.gravity.x = gx;
    engine.world.gravity.y = gy;
  });
} */


//2. 启用设备方向感应控制磁铁吸附和重力
/* if (window.DeviceOrientationEvent) {
  let lastBeta = null;
  let lastShakeTime = 0;

  window.addEventListener('deviceorientation', async event => {
    const gamma = event.gamma; // 左右倾斜 [-90, 90]
    const beta = event.beta;   // 前后倾斜 [-180, 180]

    // 检测摇晃（beta 变化剧烈，短时间内变化大于一定阈值）
    const now = Date.now();
    if (lastBeta !== null && Math.abs(beta - lastBeta) > 35 && (now - lastShakeTime > 1000)) {
      attractOn = false;
      World.remove(engine.world, magnetBodies);
      magnetBodies = [];
      magnetSegments = [];
      particles.forEach(p => {
        const angle = Math.random() * 2 * Math.PI;
        Body.setVelocity(p, {
          x: Math.cos(angle) * p._initialSpeed,
          y: Math.sin(angle) * p._initialSpeed
        });
      });
      lastShakeTime = now;
    }
    lastBeta = beta;

    // 判断是否平放：beta ≈ 90° 表示手机平放
    const isFlat = Math.abs(beta - 0) < 10;

    if (isFlat) {
      // 平放 -> 关闭吸附、关闭重力
      attractOn = false;
      engine.world.gravity.x = 0;
      engine.world.gravity.y = 0;
    } else {
      // 抬起手机 -> 开启吸附
      if (!attractOn) {
        attractOn = true;
        await updateTimeMagnet();
        engine.world.gravity.x = 0;
      engine.world.gravity.y = 0;
        
      }

      /* // 同时添加重力方向
      const gx = Math.max(-1, Math.min(1, gamma / 45));
      const gy = Math.max(-1, Math.min(1, beta / 45));
      engine.world.gravity.x = gx;
      engine.world.gravity.y = gy; */
  
let currentMode = 'free'; // 'free', 'magnet', 'cooldown'

// 监听重力方向（用于平放 / 抬起判定）
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', async event => {
    const gamma = event.gamma; // 左右倾斜 [-90, 90]
    const beta = event.beta;   // 前后倾斜 [-180, 180]

    const absGamma = Math.abs(gamma);
    const absBeta = Math.abs(beta);

    const flatThreshold = 10;
    const uprightThreshold = 40;

    if (currentMode === 'free') {
      // 手机从平放 ➜ 抬起：启动吸附
      if (absGamma > uprightThreshold || absBeta > uprightThreshold) {
        currentMode = 'magnet';
        attractOn = true;
        await updateTimeMagnet();

        // 吸附时关闭重力影响
        engine.world.gravity.x = 0;
        engine.world.gravity.y = 0;
      }
    }
  });
}

// 监听摇晃（用于触发分散 + 吸附关闭）
if (window.DeviceMotionEvent) {
  window.addEventListener('devicemotion', event => {
    if (currentMode !== 'magnet') return;

    const acc = event.accelerationIncludingGravity;
    const totalAcc = Math.sqrt(
      acc.x * acc.x +
      acc.y * acc.y +
      acc.z * acc.z
    );

    const shakeThreshold = 20;

    if (totalAcc > shakeThreshold) {
      // 切换到冷却模式
      currentMode = 'cooldown';
      attractOn = false;

      // 移除磁铁
      magnetBodies.forEach(b => World.remove(engine.world, b));
      magnetBodies = [];
      magnetSegments = [];

      // 粒子自由散开
      particles.forEach(p => {
        const angle = Math.random() * 2 * Math.PI;
        Body.setVelocity(p, {
          x: Math.cos(angle) * p._initialSpeed,
          y: Math.sin(angle) * p._initialSpeed
        });
      });

      // 震动提示
      if (navigator.vibrate) navigator.vibrate(150);

      // 冷却结束后允许再次进入吸附
      setTimeout(() => {
        currentMode = 'free';
      }, 2000);
    }
  });
}
