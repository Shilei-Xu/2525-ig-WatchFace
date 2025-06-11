const { Engine, Render, World, Bodies, Body, Events, Svg, Vertices } = Matter;

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
Engine.run(engine);

// 创建边界墙（调整为完全弹性碰撞）
const thickness = 50;
const wallOptions = {
  isStatic: true,
  restitution: 1.0,  // 完全弹性碰撞
  friction: 0,      // 无摩擦力
  render: { fillStyle: '#333' }
};
World.add(engine.world, [
  Bodies.rectangle(width/2, -thickness/2, width, thickness, wallOptions),
  Bodies.rectangle(width/2, height+thickness/2, width, thickness, wallOptions),
  Bodies.rectangle(-thickness/2, height/2, thickness, height, wallOptions),
  Bodies.rectangle(width+thickness/2, height/2, thickness, height, wallOptions),
]);

// 创建粒子（优化物理参数）
const particles = [];
for (let i = 0; i < 6000; i++) {
  const p = Bodies.circle(
    Math.random() * (width - 100) + 50,
    Math.random() * (height - 100) + 50,
    4,
    { 
      restitution: 0.98,  // 高弹性
      friction: 0.001,    // 极低摩擦力
      frictionAir: 0.01,  // 轻微空气阻力
      inertia: Infinity,  // 防止旋转
      render: { 
        fillStyle: 'rgba(100,200,255,0.8)',
        
       
      } 
    }
  );
  const ang = Math.random() * 2 * Math.PI;
  Body.setVelocity(p, { x: Math.cos(ang) * 5, y: Math.sin(ang) * 5 });
  particles.push(p);
}
World.add(engine.world, particles);

// 存储刚体引用
let svgBodies = [];

// 点击加载SVG（优化刚体参数）
window.addEventListener('click', async () => {
  // 移除之前的刚体
  svgBodies.forEach(body => World.remove(engine.world, body));
  svgBodies = [];
  
  try {
    const response = await fetch('line.svg');
    const svgText = await response.text();
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const paths = doc.querySelectorAll('path');
    
    paths.forEach(path => {
      const verts = Svg.pathToVertices(path, 20);
      const center = Vertices.centre(verts);
      const shiftedVerts = verts.map(v => ({ x: v.x - center.x, y: v.y - center.y }));

      const body = Bodies.fromVertices(
        center.x, 
        center.y, 
        [shiftedVerts],
        {
          isStatic: true,
          restitution: 0.9,  // 高弹性
          friction: 0.001,  // 极低摩擦力
          render: {
            fillStyle: 'rgba(255, 0, 0, 0)',  // 更透明
        
          }
        }
      );
      
      if (body) {
        World.add(engine.world, body);
        svgBodies.push(body);
        
        // 添加轻微震动效果
        setTimeout(() => {
          Body.setStatic(body, false);
          Body.setVelocity(body, { x: 0, y: 0 });
          Body.setStatic(body, true);
        }, 50);
      }
    });
    
  } catch (error) {
    console.error('加载SVG失败:', error);
  }
});

// 添加速度维持逻辑（防止能量损失过多）
Events.on(engine, 'beforeUpdate', () => {
  particles.forEach(p => {
    const speed = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y);
    if (speed < 2) {  // 如果速度过小
      const angle = Math.atan2(p.velocity.y, p.velocity.x);
      Body.setVelocity(p, {
        x: Math.cos(angle) * 3,
        y: Math.sin(angle) * 3
      });
    }
  });
});

let handSec;
let handMin;
let handHour;
let center;

// 定义 Block 类
class Block {
  constructor(world, attributes, options = {}) {
    this.w = attributes.w;
    this.h = attributes.h;
    this.color = attributes.color;
    
    this.body = Matter.Bodies.rectangle(
      attributes.x, 
      attributes.y, 
      attributes.w, 
      attributes.h, 
      options
    );
    Matter.World.add(world, this.body);
  }
  
  rotate(angle, point) {
    Matter.Body.setAngle(this.body, angle);
    Matter.Body.setPosition(this.body, point);
  }
  
  draw() {
    push();
    translate(this.body.position.x, this.body.position.y);
    rotate(this.body.angle);
    rectMode(CENTER);
    fill(this.color);
    rect(0, 0, this.w, this.h);
    pop();
  }
}

function setup() {
  const canvas = createCanvas(600, 600);
  center = { x: width / 2, y: height / 2 };

  // create an engine
  let engine = Matter.Engine.create();
  let world = engine.world;

  // handles of the clock
  handSec = new Block(world, 
    { w: 5, h: 300, x: center.x, y: center.y - 150, color: 'white' }, 
    { isStatic: true });
  handMin = new Block(world, 
    { w: 10, h: 250, x: center.x, y: center.y - 125, color: 'white' }, 
    { isStatic: true });
  handHour = new Block(world, 
    { w: 15, h: 200, x: center.x, y: center.y - 100, color: 'white' }, 
    { isStatic: true });

  // run the engine
  Matter.Runner.run(engine);
}

function draw() {
  background('black');

  const angleSec = map(second(), 0, 60, 0, TWO_PI);
  const angleMin = map(minute(), 0, 60, 0, TWO_PI);
  const angleHour = map(hour(), 0, 12, 0, TWO_PI);

  handSec.rotate(angleSec, { x: center.x, y: center.y });
  handMin.rotate(angleMin, { x: center.x, y: center.y });
  handHour.rotate(angleHour, { x: center.x, y: center.y });

  handSec.draw();
  handMin.draw();
  handHour.draw();
}