let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body;

let engine, world;
let physicsEnabled = false;
let activationInterval;

let hourTrail = [];
let minuteTrail = [];
let secondTrail = [];
let secondBallTrails = Array.from({ length: 10 }, () => []);

function setup() {
  createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0; // 初始无重力
  background(0);
  
  // 创建不可见的边界墙
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
  background(0, 25); // 半透明背景产生拖尾渐隐效果
  
  Engine.update(engine);

  // 控制粒子生成频率（每3帧生成一次）
  if (frameCount % 3 === 0 && !physicsEnabled) {
    drawClockArms();
  }

  updateAndShowTrail(hourTrail);
  updateAndShowTrail(minuteTrail);
  updateAndShowTrail(secondTrail);

  for (let i = 0; i < secondBallTrails.length; i++) {
    updateAndShowTrail(secondBallTrails[i]);
  }
}

function mousePressed() {
  if (!physicsEnabled) {
    physicsEnabled = true;
    world.gravity.y = 0; // 保持无重力
    
    // 计算画布中心
    const centerX = width / 2;
    const centerY = height / 2;
    
    // 获取所有粒子
    let allParticles = [
      ...hourTrail, 
      ...minuteTrail, 
      ...secondTrail,
      ...secondBallTrails.flat()
    ];
    
    // 分批激活烟花效果
    let activatedCount = 0;
    activationInterval = setInterval(() => {
      for (let i = 0; i < 20; i++) { // 每批激活20个
        if (activatedCount < allParticles.length) {
          const p = allParticles[activatedCount];
          p.enablePhysics();
          
          if (p.body) {
            // 计算从中心到粒子的方向
            const dirX = p.x - centerX;
            const dirY = p.y - centerY;
            // 归一化并乘以爆炸力
            const distance = dist(centerX, centerY, p.x, p.y);
            const forceMagnitude = map(distance, 0, 500, 15, 5, true); // 近处力度大，远处力度小
            
            // 施加爆炸力
            Body.setVelocity(p.body, {
              x: (dirX/distance) * forceMagnitude * random(0.8, 1.2),
              y: (dirY/distance) * forceMagnitude * random(0.8, 1.2)
            });
            
            // 添加随机旋转
            Body.setAngularVelocity(p.body, random(-0.05, 0.05));
          }
          
          activatedCount++;
        } else {
          clearInterval(activationInterval);
          break;
        }
      }
    }, 50); // 每50ms激活一批
  }
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    resetSimulation();
  }
}

function resetSimulation() {
  if (activationInterval) clearInterval(activationInterval);
  physicsEnabled = false;
  
  // 移除所有物理体
  const allParticles = [
    ...hourTrail, 
    ...minuteTrail, 
    ...secondTrail,
    ...secondBallTrails.flat()
  ];
  allParticles.forEach(p => {
    if (p.body) World.remove(world, p.body);
  });
  
  // 重置数组
  hourTrail = [];
  minuteTrail = [];
  secondTrail = [];
  secondBallTrails = Array.from({ length: 10 }, () => []);
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

class TrailParticle {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.opacity = 220;
    this.body = null;
    this.lifetime = 250;
    this.color = color(
      random(150, 255),
      random(100, 200),
      random(150, 255),
      220
    );
  }
  
  enablePhysics() {
    if (!this.body) {
      this.body = Bodies.circle(this.x, this.y, this.r, {
        restitution: 0.6, // 高弹性
        friction: 0.005,
        frictionAir: 0.02, // 少量空气阻力
        density: 0.002,
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
      this.r *= 0.998; // 物理模式下也缓慢缩小
    } else {
      this.r *= 0.996;
      this.opacity *= 0.985;
    }
  }
  
  show() {
    push();
    translate(this.x, this.y);
    noStroke();
    
    if (this.body) {
      // 物理模式下使用彩色
      this.color.setAlpha(min(this.lifetime, 200));
      fill(this.color);
      
      // 添加发光效果
      drawingContext.shadowBlur = 15;
      drawingContext.shadowColor = this.color.toString();
    } else {
      // 非物理模式用白色
      fill(255, this.opacity);
      drawingContext.shadowBlur = 0;
    }
    
    ellipse(0, 0, this.r * 2);
    pop();
  }
  
  shouldRemove() {
    return this.r < 0.5 || this.opacity < 2 || this.lifetime < 0;
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
  
  // 时针和分针拖尾（限制数量）
  if (minuteTrail.length < 80) {
    let minX = cos(minAngle) * minLength;
    let minY = sin(minAngle) * minLength;
    minuteTrail.push(new TrailParticle(width/2 + minX, height/2 + minY, 16));
  }
  
  if (hourTrail.length < 60) {
    let hourX = cos(hourAngle) * hourLength;
    let hourY = sin(hourAngle) * hourLength;
    hourTrail.push(new TrailParticle(width/2 + hourX, height/2 + hourY, 20));
  }
  
  // 秒针上的10个粒子（限制数量）
  for (let i = 0; i < 10; i++) {
    if (secondBallTrails[i].length < 40) {
      let t = (i + 1) / 10;
      let len = secLength * t;
      let r = lerp(14, 3, t);
      let x = cos(secAngle) * len;
      let y = sin(secAngle) * len;
      
      secondBallTrails[i].push(
        new TrailParticle(width/2 + x, height/2 + y, r)
      );
    }
  }
  
  pop();
}