// Matter.js alias
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
let secondBallTrails = Array.from({ length: 10 }, () => []);
let lastGenTime = {
  hour: 0,
  minute: 0,
  second: Array(10).fill(0)
};

let themeColor;
let now; // global timestamp

function setup() {
  createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;
  themeColor = color(80, 200, 255); // 青蓝色

  const thickness = 50;
  const options = { isStatic: true, render: { visible: false } };
  World.add(world, [
    Bodies.rectangle(width / 2, -thickness / 2, width, thickness, options),
    Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, options),
    Bodies.rectangle(-thickness / 2, height / 2, thickness, height, options),
    Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, options)
  ]);
  background(0);
}

function draw() {
  now = millis();
  background(0, 25);
  Engine.update(engine);

  if (physicsEnabled && now > secondaryExplosionTime && secondaryExplosionTime > 0) {
    triggerSecondaryExplosion();
    secondaryExplosionTime = 0;
  }

  if (!physicsEnabled) {
    drawClockArmsStable();
  }

  updateAndShowTrail(hourTrail);
  updateAndShowTrail(minuteTrail);
  for (let i = 0; i < secondBallTrails.length; i++) {
    updateAndShowTrail(secondBallTrails[i]);
  }
}

function mousePressed() {
  if (!physicsEnabled) {
    physicsEnabled = true;
    explodingBallIndex = 9;
    ballExplosionInterval = setInterval(explodeNextBall, 150);
    secondaryExplosionTime = now + 2000;
  }
}

function explodeNextBall() {
  if (explodingBallIndex >= 0) {
    secondBallTrails[explodingBallIndex].forEach(p => {
      p.enablePhysics();
      const force = random(8, 12);
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
      const sub = new TrailParticle(
        p.x, p.y,
        p.r * 0.6,
        color(255),
        p.type
      );
      sub.enablePhysics();
      Body.setVelocity(sub.body, {
        x: cos(angle + random(-0.5, 0.5)) * newForce * 0.7,
        y: sin(angle + random(-0.5, 0.5)) * newForce * 0.7
      });
      if (p.type === 'hour') hourTrail.push(sub);
      else if (p.type === 'minute') minuteTrail.push(sub);
    }
  });
}

class TrailParticle {
  constructor(x, y, r, col, type) {
    this.x = x;
    this.y = y;
    this.r = r * 1.5;
    this.type = type || 'secondBall';
    this.color = col || this.getDefaultColor();
    this.opacity = 220;
    this.body = null;
    this.lifetime = 900;
  }

  getDefaultColor() {
    return color(255);
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
      this.r *= 0.998;
    } else {
      this.r *= 0.99;
      this.opacity *= 0.998;
    }
  }

  show() {
    push();
    translate(this.x, this.y);
    noStroke();
    this.color.setAlpha(min(this.lifetime, this.opacity));
    fill(this.color);
    drawingContext.shadowBlur = 8;
    drawingContext.shadowColor = this.color.toString();
    ellipse(0, 0, this.r * 2);
    pop();
  }

  shouldRemove() {
    return this.r < 1 || this.lifetime < 0;
  }
}

function updateAndShowTrail(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    arr[i].update();
    arr[i].show();
    if (arr[i].shouldRemove()) {
      if (arr[i].body) World.remove(world, arr[i].body);
      arr.splice(i, 1);
    }
  }
}

function drawClockArmsStable() {
  push();
  translate(width / 2, height / 2);
  let s = second();
  let m = minute();
  let h = hour() % 12;

  let secAngle = map(s, 0, 60, 0, TWO_PI) - HALF_PI;
  let minAngle = map(m, 0, 60, 0, TWO_PI) - HALF_PI;
  let hourAngle = map(h + m / 60, 0, 12, 0, TWO_PI) - HALF_PI;

  if (now - lastGenTime.minute > 200 && minuteTrail.length < 30) {
    let minX = cos(minAngle) * 280;
    let minY = sin(minAngle) * 280;
    minuteTrail.push(new TrailParticle(width/2 + minX, height/2 + minY, 10, color(255), 'minute'));
    lastGenTime.minute = now;
  }

  if (now - lastGenTime.hour > 300 && hourTrail.length < 20) {
    let hourX = cos(hourAngle) * 180;
    let hourY = sin(hourAngle) * 180;
    hourTrail.push(new TrailParticle(width/2 + hourX, height/2 + hourY, 14, color(255), 'hour'));
    lastGenTime.hour = now;
  }

  for (let i = 0; i < 10; i++) {
    if (now - lastGenTime.second[i] > 100 && secondBallTrails[i].length < 30) {
      let t = (i + 1) / 10;
      let len = 400 * t;
      let r = lerp(12, 4, t);
      let ballColor = lerpColor(color(255), themeColor, t);
      let x = cos(secAngle) * len;
      let y = sin(secAngle) * len;
      secondBallTrails[i].push(
        new TrailParticle(width / 2 + x, height / 2 + y, r, ballColor, 'secondBall')
      );
      lastGenTime.second[i] = now;
    }
  }
  pop();
}
