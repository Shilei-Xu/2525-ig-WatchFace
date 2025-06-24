let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body;

let engine, world;
let physicsEnabled = false;
let explodingBallIndex = -1;
let ballExplosionInterval;

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
  
  // 创建不可见边界
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
  background(0, 30);
  Engine.update(engine);

  if (!physicsEnabled && frameCount % 3 === 0) {
    drawClockArms();
  }

  updateAndShowTrail(hourTrail);
  updateAndShowTrail(minuteTrail);
  updateAndShowTrail(secondTrail);

  for (let i = 0; i < secondBallTrails.length; i++) {
    updateAndShowTrail(secondBallTrails[i]);
  }

  // 调试显示当前爆破的小球索引
  if (physicsEnabled) {
    fill(255);
    text("Exploding ball: " + (9 - explodingBallIndex), 20, 30);
  }
}

function mousePressed() {
  if (!physicsEnabled) {
    physicsEnabled = true;
    world.gravity.y = 0;
    
    // 从最外层小球(索引9)开始依次爆破
    explodingBallIndex = 9;
    ballExplosionInterval = setInterval(explodeNextBall, 200); // 每200ms爆一个
  }
}

function explodeNextBall() {
  if (explodingBallIndex >= 0) {
    // 爆破当前小球的所有拖尾粒子
    secondBallTrails[explodingBallIndex].forEach(p => {
      p.enablePhysics();
      const angle = random(TWO_PI);
      const force = random(6, 8);
      Body.setVelocity(p.body, {
        x: cos(angle) * force,
        y: sin(angle) * force
      });
    });
    
    explodingBallIndex--;
  } else {
    clearInterval(ballExplosionInterval);
    // 最后爆破时针/分针粒子
    [...hourTrail, ...minuteTrail].forEach(p => p.enablePhysics());
  }
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    resetSimulation();
  }
}

function resetSimulation() {
  physicsEnabled = false;
  clearInterval(ballExplosionInterval);
  explodingBallIndex = -1;
  
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

class TrailParticle {
  constructor(x, y, r, col) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = col || color(
      random(150, 255),
      random(100, 200),
      random(150, 255)
    );
    this.opacity = 220;
    this.body = null;
    this.lifetime = 250;
  }
  
  enablePhysics() {
    if (!this.body) {
      this.body = Bodies.circle(this.x, this.y, this.r, {
        restitution: 0.6,
        friction: 0.01,
        frictionAir: 0.01,
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
      this.r *= 0.998;
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
      this.color.setAlpha(min(this.lifetime, 200));
      fill(this.color);
      drawingContext.shadowBlur = 15;
      drawingContext.shadowColor = this.color.toString();
    } else {
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