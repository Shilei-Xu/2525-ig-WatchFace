let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body;

let engine, world;
let physicsEnabled = false;
let explodingBallIndex = -1;
let ballExplosionInterval;
let secondaryExplosionTime = 0;

let hourTrail = [];
let minuteTrail = [];
let secondTrail = [];
let secondBallTrails = Array.from({ length: 10 }, () => []);

let lastGenTime = { hour: 0, minute: 0, second: Array(10).fill(0) };
let themeColor;

function setup() {
  createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;
  background(0);

  themeColor = color(50, 200, 220); // 青蓝主题色

  // 边界
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

  if (physicsEnabled && millis() > secondaryExplosionTime && secondaryExplosionTime > 0) {
    triggerSecondaryExplosion();
    secondaryExplosionTime = 0;
  }

  if (!physicsEnabled) {
    drawClockArmsStable();
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
    explodingBallIndex = 9;
    ballExplosionInterval = setInterval(explodeNextBall, 150);
    secondaryExplosionTime = millis() + 2000;
  }
}

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
    [...hourTrail, ...minuteTrail].forEach(p => {
      p.enablePhysics();
      const force = random(10, 15);
      const angle = random(TWO_PI);
      Body.setVelocity(p.body, {
        x: cos(angle) * force,
        y: sin(angle) * force
      });
    });
  }
}

function triggerSecondaryExplosion() {
  const allParticles = [...hourTrail, ...minuteTrail].filter(p => p.body);
  allParticles.forEach(p => {
    const newForce = random(12, 18);
    const angle = random(TWO_PI);
    Body.setVelocity(p.body, {
      x: cos(angle) * newForce,
      y: sin(angle) * newForce
    });

    for (let i = 0; i < 3; i++) {
      const subParticle = new TrailParticle(
        p.x, p.y,
        p.r * 0.6,
        themeColor,
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

class TrailParticle {
  constructor(x, y, r, col, type) {
    this.x = x;
    this.y = y;
    this.r = r * 1.5;
    this.type = type || 'secondBall';
    this.color = col || themeColor;
    this.opacity = 220;
    this.body = null;
    this.lifetime = 300;
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

function drawClockArmsStable() {
  let now = millis();
  let s = second();
  let m = minute();
  let h = hour() % 12;

  let secAngle = map(s, 0, 60, 0, TWO_PI) - HALF_PI;
  let minAngle = map(m, 0, 60, 0, TWO_PI) - HALF_PI;
  let hourAngle = map(h + m / 60, 0, 12, 0, TWO_PI) - HALF_PI;

  let secLength = 400;
  let minLength = 280;
  let hourLength = 180;

  if (now - lastGenTime.hour > 300 && hourTrail.length < 100) {
    let x = cos(hourAngle) * hourLength + width / 2;
    let y = sin(hourAngle) * hourLength + height / 2;
    hourTrail.push(new TrailParticle(x, y, 20, themeColor, 'hour'));
    lastGenTime.hour = now;
  }

  if (now - lastGenTime.minute > 200 && minuteTrail.length < 150) {
    let x = cos(minAngle) * minLength + width / 2;
    let y = sin(minAngle) * minLength + height / 2;
    minuteTrail.push(new TrailParticle(x, y, 16, themeColor, 'minute'));
    lastGenTime.minute = now;
  }

  for (let i = 0; i < 10; i++) {
    if (now - lastGenTime.second[i] > 100 && secondBallTrails[i].length < 30) {
      let t = (i + 1) / 10;
      let len = secLength * t;
      let r = lerp(12, 4, t);
      let x = cos(secAngle) * len + width / 2;
      let y = sin(secAngle) * len + height / 2;
      secondBallTrails[i].push(new TrailParticle(x, y, r, themeColor, 'secondBall'));
      lastGenTime.second[i] = now;
    }
  }
}
