let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body;

let engine, world;
let physicsEnabled = false;
let explodingBallIndex = -1;
let ballExplosionInterval;
let secondaryExplosionTime = 0;

// 粒子数组
let hourTrail = [];
let minuteTrail = [];
let secondTrail = [];
let secondBallTrails = Array.from({ length: 10 }, () => []);

function setup() {
  createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;
  background(0);
  
  // 边界墙（不可见）
  const thickness = 50;
  const options = { isStatic: true, render: { visible: false } };
  World.add(world, [
    Bodies.rectangle(width/2, -thickness/2, width, thickness, options),
    Bodies.rectangle(width/2, height+thickness/2, width, thickness, options),
    Bodies.rectangle(-thickness/2, height/2, thickness, height, options),
    Bodies.rectangle(width+thickness/2, height/2, thickness, height, options)
  ]);
}

function draw() {
  background(0, 25);
  Engine.update(engine);

  // 二次爆炸检测
  if (physicsEnabled && millis() > secondaryExplosionTime && secondaryExplosionTime > 0) {
    triggerSecondaryExplosion();
    secondaryExplosionTime = 0; // 只触发一次
  }

  if (!physicsEnabled && frameCount % 3 === 0) {
    drawClockArms();
  }

  updateAndShowTrail(hourTrail);
  updateAndShowTrail(minuteTrail);
  updateAndShowTrail(secondTrail);

  for (let i = 0; i < secondBallTrails.length; i++) {
    updateAndShowTrail(secondBallTrails[i]);
  }
}

// 首次点击触发爆炸
function mousePressed() {
  if (!physicsEnabled) {
    physicsEnabled = true;
    
    // 秒针小球依次爆破
    explodingBallIndex = 9;
    ballExplosionInterval = setInterval(explodeNextBall, 150); 
    
    // 设置2秒后触发二次爆炸
    secondaryExplosionTime = millis() + 2000;
  }
}

// 秒针小球爆破
function explodeNextBall() {
  if (explodingBallIndex >= 0) {
    secondBallTrails[explodingBallIndex].forEach(p => {
      p.enablePhysics();
      const force = p.type === 'secondBall' ? random(8, 12) : random(6, 10);
      const angle = random(TWO_PI);
      Body.setVelocity(p.body, {
        x: cos(angle) * force,
        y: sin(angle) * force
      });
    });
    explodingBallIndex--;
  } else {
    clearInterval(ballExplosionInterval);
    // 爆破时针/分针
    [...hourTrail, ...minuteTrail].forEach(p => {
      p.enablePhysics();
      const force = random(10, 15); // 时针分针初始爆破更强
      const angle = random(TWO_PI);
      Body.setVelocity(p.body, {
        x: cos(angle) * force,
        y: sin(angle) * force
      });
    });
  }
}

// 二次爆炸（时针/分针粒子）
function triggerSecondaryExplosion() {
  const allParticles = [...hourTrail, ...minuteTrail].filter(p => p.body);
  
  allParticles.forEach(p => {
    // 为每个粒子添加新的爆炸力
    const newForce = random(12, 18); // 二次爆炸更强
    const angle = random(TWO_PI);
    Body.setVelocity(p.body, {
      x: cos(angle) * newForce,
      y: sin(angle) * newForce
    });
    
    // 产生子粒子（增强效果）
    for (let i = 0; i < 3; i++) {
      const subParticle = new TrailParticle(
        p.x, p.y, 
        p.r * 0.6, 
        p.type === 'hour' ? color(100, 255, 100) : color(255, 100, 100),
        p.type
      );
      subParticle.enablePhysics();
      Body.setVelocity(subParticle.body, {
        x: cos(angle + random(-0.5, 0.5)) * newForce * 0.7,
        y: sin(angle + random(-0.5, 0.5)) * newForce * 0.7
      });
      if (p.type === 'hour') hourTrail.push(subParticle);
      else minuteTrail.push(subParticle);
    }
  });
}

// 粒子类（修改后）
class TrailParticle {
  constructor(x, y, r, col, type) {
    this.x = x;
    this.y = y;
    this.r = r * 1.5; // 所有粒子增大50%
    this.type = type || 'secondBall';
    this.color = col || this.getDefaultColor();
    this.opacity = 220;
    this.body = null;
    this.lifetime = 300;
  }

  getDefaultColor() {
    return this.type === 'hour' ? color(100, 255, 100) : 
           this.type === 'minute' ? color(255, 100, 100) :
           color(100, 200, 255);
  }

  enablePhysics() {
    if (!this.body) {
      this.body = Bodies.circle(this.x, this.y, this.r, {
        restitution: 0.7,
        friction: 0.005,
        frictionAir: 0.02,
        density: 0.001,
        render: { visible: false }
      });
      World.add(world, this.body);
    }
  }

  update() {
    if (this.body) {
      this.x = this.body.position.x;
      this.y = this.body.position.y;
      this.lifetime -= 1;
      this.r *= 0.995;
    } else {
      this.r *= 0.99;
      this.opacity *= 0.98;
    }
  }

  show() {
    push();
    translate(this.x, this.y);
    noStroke();
    
    this.color.setAlpha(min(this.lifetime, this.opacity));
    fill(this.color);
    
    // 增强光晕
    drawingContext.shadowBlur = 25;
    drawingContext.shadowColor = this.color.toString();
    
    ellipse(0, 0, this.r * 2);
    pop();
  }

  shouldRemove() {
    return this.r < 1 || this.lifetime < 0;
  }
}

function updateAndShowTrail(trailArray) {
  for (let i = trailArray.length - 1; i >= 0; i--) {
    trailArray[i].update();
    trailArray[i].show();
    
    if (trailArray[i].shouldRemove()) {
      if (trailArray[i].body) {
        World.remove(world, trailArray[i].body);
      }
      trailArray.splice(i, 1);
    }
  }
}

function drawClockArms() {
  push();
  translate(width / 2, height / 2);
  
  let s = second();
  let m = minute();
  let h = hour() % 12;
  
  let secAngle = map(s, 0, 60, 0, TWO_PI) - HALF_PI;
  let minAngle = map(m, 0, 60, 0, TWO_PI) - HALF_PI;
  let hourAngle = map(h + m/60, 0, 12, 0, TWO_PI) - HALF_PI;
  
  let secLength = 400;
  let minLength = 280;
  let hourLength = 180;
  
  // 时针和分针拖尾
  if (minuteTrail.length < 30) {
    let minX = cos(minAngle) * minLength;
    let minY = sin(minAngle) * minLength;
    minuteTrail.push(new TrailParticle(width/2 + minX, height/2 + minY, 16));
  }
  
  if (hourTrail.length < 20) {
    let hourX = cos(hourAngle) * hourLength;
    let hourY = sin(hourAngle) * hourLength;
    hourTrail.push(new TrailParticle(width/2 + hourX, height/2 + hourY, 20));
  }
  
  // 秒针上的10个粒子（从中心到外围编号0-9）
  for (let i = 0; i < 10; i++) {
    if (secondBallTrails[i].length < 25) {
      let t = (i + 1) / 10;
      let len = secLength * t;
      let r = lerp(12, 4, t);
      
      // 小球颜色渐变（中心红→外围蓝）
      let ballColor = color(
        map(i, 0, 9, 255, 100),
        map(i, 0, 9, 50, 100),
        map(i, 0, 9, 50, 200)
      );
      
      let x = cos(secAngle) * len;
      let y = sin(secAngle) * len;
      
      secondBallTrails[i].push(
        new TrailParticle(width/2 + x, height/2 + y, r, ballColor)
      );
    }
  }
  
  pop();
}
// 其他函数保持不变（updateAndShowTrail, drawClockArms, resetSimulation等）