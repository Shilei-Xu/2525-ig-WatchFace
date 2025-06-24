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
  world.gravity.y = 0;
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
    world.gravity.y = 0;
    
    let allParticles = [
      ...hourTrail, 
      ...minuteTrail, 
      ...secondTrail,
      ...secondBallTrails.flat()
    ];
    
    let activatedCount = 0;
    activationInterval = setInterval(() => {
      for (let i = 0; i < 20; i++) {
        if (activatedCount < allParticles.length) {
          const p = allParticles[activatedCount];
          p.enablePhysics();
          
          if (p.body) {
            // 每个粒子从自己的中心向随机方向炸开
            const angle = random(TWO_PI);
            const force = random(2, 4);
            
            Body.setVelocity(p.body, {
              x: cos(angle) * force * random(0.8, 1.2),
              y: sin(angle) * force * random(0.8, 1.2)
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
    }, 50);
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
  
  const allParticles = [
    ...hourTrail, 
    ...minuteTrail, 
    ...secondTrail,
    ...secondBallTrails.flat()
  ];
  allParticles.forEach(p => {
    if (p.body) World.remove(world, p.body);
  });
  
  hourTrail = [];
  minuteTrail = [];
  secondTrail = [];
  secondBallTrails = Array.from({ length: 10 }, () => []);
}

class TrailParticle {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.opacity = 220;
    this.body = null;
    this.lifetime = 600;
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
        restitution: 0.5,
        friction: 0.005,
        frictionAir: 0.01,
        density: 0.003,
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
      drawingContext.shadowBlur = 5;
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
  
  let secLength = 480;
  let minLength = 280;
  let hourLength = 180;
  
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
  
  for (let i = 0; i < 10; i++) {
    if (secondBallTrails[i].length < 40) {
      let t = (i + 1) / 10;
      let len = secLength * t;
      let r = lerp(16, 5, t);
      let x = cos(secAngle) * len;
      let y = sin(secAngle) * len;
      
      secondBallTrails[i].push(
        new TrailParticle(width/2 + x, height/2 + y, r)
      );
    }
  }
  
  pop();
}