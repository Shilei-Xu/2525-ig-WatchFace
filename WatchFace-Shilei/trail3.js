let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;

let engine, world;
let mainParticle = null;
let trailParticles = [];

let hourTrail = [];
let minuteTrail = [];
let secondTrail = [];

function setup() {
  createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 1;
  background(100);
}

function draw() {
  background(100);
  Engine.update(engine);

  // 更新并显示时钟指针轨迹
  updateAndShowTrail(hourTrail);
  updateAndShowTrail(minuteTrail);
  updateAndShowTrail(secondTrail);

  drawClockArms();
}

function updateAndShowTrail(trailArray) {
  for (let i = trailArray.length - 1; i >= 0; i--) {
    trailArray[i].update();
    trailArray[i].show();
    if (trailArray[i].r < 1 || trailArray[i].opacity < 5) {
      trailArray.splice(i, 1);
    }
  }
}

class Particle {
  constructor(x, y) {
    this.r = random(40, 60);
    this.opacity = 255;
    this.body = Bodies.circle(x, y, this.r, {
      restitution: 0.5,
      friction: 0.05,
    });
    World.add(world, this.body);
  }
  update() {
    this.r *= 0.995;
    this.opacity *= 0.99;
  }
  show() {
    let pos = this.body.position;
    push();
    translate(pos.x, pos.y);
    stroke(0);
    strokeWeight(1);
    fill(255, this.opacity);
    ellipse(0, 0, this.r * 2);
    pop();
  }
}

class TrailParticle {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.opacity = 220;
  }
  update() {
    this.r *= 0.99;        // 慢慢变小
    this.opacity *= 0.97;  // 慢慢淡出
  }
  show() {
    push();
    translate(this.x, this.y);
    noStroke();
    fill(255, this.opacity);
    ellipse(0, 0, this.r * 2);
    pop();
  }
}

// 时钟指针和拖尾粒子
function drawClockArms() {
  push();
  translate(width / 2, height / 2);
  let s = second();
  let m = minute();
  let h = hour() % 12;

  let secAngle = map(s, 0, 60, 0, TWO_PI);
  let minAngle = map(m, 0, 60, 0, TWO_PI);
  let hourAngle = map(h + m / 60, 0, 12, 0, TWO_PI);

  let secX = cos(secAngle - HALF_PI) * 300;
  let secY = sin(secAngle - HALF_PI) * 300;
  let minX = cos(minAngle - HALF_PI) * 200;
  let minY = sin(minAngle - HALF_PI) * 200;
  let hourX = cos(hourAngle - HALF_PI) * 120;
  let hourY = sin(hourAngle - HALF_PI) * 120;

  // 更大的球体拖尾
  secondTrail.push(new TrailParticle(width / 2 + secX, height / 2 + secY, 14));
  minuteTrail.push(new TrailParticle(width / 2 + minX, height / 2 + minY, 18));
  hourTrail.push(new TrailParticle(width / 2 + hourX, height / 2 + hourY, 22));

  if (secondTrail.length > 100) secondTrail.shift();
  if (minuteTrail.length > 100) minuteTrail.shift();
  if (hourTrail.length > 100) hourTrail.shift();

  drawArm(secAngle, 300, color(255));
  drawArm(minAngle, 200, color(255));
  drawArm(hourAngle, 120, color(255));
  pop();
}

function drawArm(angle, length, col) {
  push();
  rotate(angle - HALF_PI);
  stroke(col);
  strokeWeight(8);
  line(0, 0, length, 0);
  pop();
}
