const { Engine, Render, World, Bodies, Body, Events, Svg } = Matter;

// 初始化引擎
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
  Bodies.rectangle(width/2, -thickness/2, width, thickness, { isStatic: true }),
  Bodies.rectangle(width/2, height+thickness/2, width, thickness, { isStatic: true }),
  Bodies.rectangle(-thickness/2, height/2, thickness, height, { isStatic: true }),
  Bodies.rectangle(width+thickness/2, height/2, thickness, height, { isStatic: true }),
]);

// 创建粒子
const particles = [];
for (let i = 0; i < 600; i++) {
  const p = Bodies.circle(
    Math.random() * (width - 20) + 10,
    Math.random() * (height - 20) + 10,
    4,
    {
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      inertia: Infinity,
      render: { fillStyle: 'rgba(100, 200, 255, 0.8)' }
    }
  );
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
        Body.setVelocity(p, { x: v.x * p._initialSpeed/s, y: v.y * p._initialSpeed/s });
      }
    });
  }
});

let magnetBodies = [];
let magnetSegments = [];
let attractOn = false;

// 点到线段最近距离
function distanceToSegment(p, p1, p2) {
  const A = p.x - p1.x;
  const B = p.y - p1.y;
  const C = p2.x - p1.x;
  const D = p2.y - p1.y;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;

  if (len_sq !== 0) {
    param = dot / len_sq;
  }

  let xx, yy;
  if (param < 0) {
    xx = p1.x;
    yy = p1.y;
  } else if (param > 1) {
    xx = p2.x;
    yy = p2.y;
  } else {
    xx = p1.x + param * C;
    yy = p1.y + param * D;
  }

  const dx = p.x - xx;
  const dy = p.y - yy;

  return {
    distance: Math.sqrt(dx * dx + dy * dy),
    point: { x: xx, y: yy }
  };
}

// 吸附行为
Events.on(engine, 'beforeUpdate', () => {
  if (!attractOn || magnetSegments.length === 0) return;

  particles.forEach(p => {
    let closestPoint = null;
    let minDistance = Infinity;

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

// 点击切换吸附模式
window.addEventListener('click', async () => {
  if (attractOn) {
    // 关闭吸附，恢复自由运动
    attractOn = false;
    World.remove(engine.world, magnetBodies);
    magnetBodies = [];
    magnetSegments = [];

    // 重新随机设置粒子方向
    particles.forEach(p => {
      const angle = Math.random() * 2 * Math.PI;
      Body.setVelocity(p, {
        x: Math.cos(angle) * p._initialSpeed,
        y: Math.sin(angle) * p._initialSpeed
      });
    });

    return;
  }

  // 启动吸附，加载 SVG
  attractOn = true;
  try {
    World.remove(engine.world, magnetBodies);
    magnetBodies = [];
    magnetSegments = [];

    const response = await fetch('1.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const paths = doc.querySelectorAll('path');

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const allVerts = [];

    paths.forEach(path => {
      const verts = Svg.pathToVertices(path, 10);
      allVerts.push(...verts);
    });

    allVerts.forEach(v => {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    });

    const svgWidth = maxX - minX;
    const svgHeight = maxY - minY;
    const centerX = width / 2;
    const centerY = height / 2;

    paths.forEach(path => {
      const verts = Svg.pathToVertices(path, 10);
      const adjustedVerts = verts.map(v => ({
        x: centerX + (v.x - minX - svgWidth / 2),
        y: centerY + (v.y - minY - svgHeight / 2)
      })).filter(v => !isNaN(v.x) && !isNaN(v.y));

      const body = Bodies.fromVertices(centerX, centerY, adjustedVerts, {
        isStatic: true,
        render: {
          fillStyle: 'transparent',
          strokeStyle: 'transparent',
          lineWidth: 0
        }
      }, true);

      if (body) {
        magnetBodies.push(body);
        for (let i = 0; i < adjustedVerts.length - 1; i++) {
          magnetSegments.push({
            p1: adjustedVerts[i],
            p2: adjustedVerts[i + 1]
          });
        }
        if (adjustedVerts.length > 2) {
          magnetSegments.push({
            p1: adjustedVerts[adjustedVerts.length - 1],
            p2: adjustedVerts[0]
          });
        }
      }
    });

    World.add(engine.world, magnetBodies);
  } catch (err) {
    console.error('Error loading SVG:', err);
    attractOn = false;
  }
});



// 调试
(function renderDebugSegments() {
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
})();
