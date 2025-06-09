let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;

let engine, world;
let mainParticle = null;
let trailParticles = [];

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

  // 更新主圆
  if (mainParticle) {
    mainParticle.update();
    mainParticle.show();

    if (mainParticle.r < 5 || mainParticle.opacity < 10 || mainParticle.body.position.y > height + 100) {
      World.remove(world, mainParticle.body);
      mainParticle = null;
    }
  }

  // 更新尾巴粒子
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    let p = trailParticles[i];
    p.update();
    p.show();
    if (p.r < 2 || p.opacity < 5) {
      trailParticles.splice(i, 1); // 移除已淡出的
    }
  }
}

function mouseDragged() {
  if (mainParticle) {
    World.remove(world, mainParticle.body);
  }

  // 创建主圆
  mainParticle = new Particle(mouseX, mouseY);

  // 拷贝一个“静态影子粒子”加入尾巴
  let trail = new TrailParticle(mouseX, mouseY, mainParticle.r);
  trailParticles.push(trail);

  // 限制尾巴长度（保留较多）
  if (trailParticles.length > 60) {
    trailParticles.shift();
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
    this.opacity = 200;
  }

  update() {
    this.r *= 0.98;
    this.opacity *= 0.95;
  }

  show() {
    push();
    translate(this.x, this.y);
    stroke(0);
    strokeWeight(1);
    fill(255, this.opacity);
    ellipse(0, 0, this.r * 2);
    pop();
  }
}



