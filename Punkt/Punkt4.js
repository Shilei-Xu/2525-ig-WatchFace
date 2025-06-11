const { Engine, Render, World, Bodies, Body, Events, Svg, Bounds } = Matter;

// 初始化物理引擎
const width = 960, height = 960;
const engine = Engine.create();
engine.world.gravity.y = 0;

const render = Render.create({
  element: document.body,
  engine,
  options: { width, height, wireframes: false, background: '#000' }
});
Render.run(render);
Matter.Runner.run(engine);

// 边界墙
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
  Body.setVelocity(p, { x: Math.cos(ang) * 3, y: Math.sin(ang) * 3 });
  p._initialSpeed = 3;
  particles.push(p);
}
World.add(engine.world, particles);

// 能量补偿
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

let magnetBodies = [];
let magnetSegments = []; // 改为存储线段而非顶点
let attractOn = false;

// 加载并处理SVG
window.addEventListener('click', async () => {
  if (attractOn) return;
  attractOn = true;
  
  try {
    // 清除现有磁体
    World.remove(engine.world, magnetBodies);
    magnetBodies = []; 
    magnetSegments = [];
    
    // 加载SVG文件
    const response = await fetch('1.svg');
    const svgText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const paths = doc.querySelectorAll('path');
    
    // 计算SVG的边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const allVerts = [];
    
    // 第一次遍历：收集所有顶点并计算边界
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
    
    // 第二次遍历：创建物理体和线段数据
    paths.forEach(path => {
      const verts = Svg.pathToVertices(path, 10);
      
      // 调整顶点位置到画布中心
      const adjustedVerts = verts.map(v => ({
        x: centerX + (v.x - minX - svgWidth / 2),
        y: centerY + (v.y - minY - svgHeight / 2)
      })).filter(v => !isNaN(v.x) && !isNaN(v.y));
      
      // 创建物理体
      const body = Bodies.fromVertices(
        centerX, 
        centerY, 
        adjustedVerts, 
        { 
          isStatic: true,
          render: { 
            fillStyle: 'transparent',
            strokeStyle: 'transparent',
            lineWidth: 0
          }
        }, 
        true
      );
      
      if (body) {
        magnetBodies.push(body);
        
        // 存储线段数据（每对相邻顶点组成一条线段）
        for (let i = 0; i < adjustedVerts.length - 1; i++) {
          magnetSegments.push({
            p1: adjustedVerts[i],
            p2: adjustedVerts[i + 1]
          });
        }
        // 闭合路径
        if (adjustedVerts.length > 2) {
          magnetSegments.push({
            p1: adjustedVerts[adjustedVerts.length - 1],
            p2: adjustedVerts[0]
          });
        }
      }
    });
    
    World.add(engine.world, magnetBodies);
    
  } catch (error) {
    console.error('Error loading SVG:', error);
    attractOn = false;
  }
});

// 点到线段的最短距离计算
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

// 粒子吸附行为 - 基于线段吸附
Events.on(engine, 'beforeUpdate', () => {
  if (!attractOn || magnetSegments.length === 0) return;

  particles.forEach(p => {
    let closestPoint = null;
    let minDistance = Infinity;
    
    // 找出最近的线段上的点
    for (const segment of magnetSegments) {
      const { distance, point } = distanceToSegment(
        p.position, 
        segment.p1, 
        segment.p2
      );
      
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
      
      // 归一化方向向量
      const len = Math.hypot(dir.x, dir.y);
      if (len > 0) {
        dir.x /= len;
        dir.y /= len;
      }
      
      // 速度控制
      const speed = Math.hypot(p.velocity.x, p.velocity.y);
      if (speed > 2) {
        Body.setVelocity(p, {
          x: p.velocity.x * 0.95,
          y: p.velocity.y * 0.95
        });
      }
      
      // 应用吸引力（距离越近越弱）
      const strength = 0.0008 * Math.min(1, minDistance / 100);
      Body.applyForce(p, p.position, {
        x: dir.x * strength,
        y: dir.y * strength
      });
    }
  });
});