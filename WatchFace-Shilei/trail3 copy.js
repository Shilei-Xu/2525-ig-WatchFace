let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;
let engine, world;
let mainParticle = null;
let trailParticles = [];
let secondTrailGroups = [];
let lastParticleTime = 0;
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

  let now = millis();
if (now - lastParticleTime > 100) { // 每 100 毫秒生成一个新粒子
  mainParticle = new Particle(mouseX, mouseY);

  // 添加尾巴粒子
  let trail = new TrailParticle(mouseX, mouseY, mainParticle.r);
  trailParticles.push(trail);
  if (trailParticles.length > 60) {
    trailParticles.shift();
  }

  lastParticleTime = now;
}

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
    drawClockArms();
    updateSecondBalls();
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
function drawClockArms() {
  push();
  translate(width / 2, height / 2); // Mittelpunkt
  let s = second();
  let m = minute();
  let h = hour() % 12;
  // Sekundenzeiger (jeder 5 Sekunden = 30 Grad)
  let secAngle = map(s, 0, 60, 0, TWO_PI);
  drawArm(secAngle, 300, color(255, 255, 255)); // Länge & Farbe wie im Bild
  // Minutenzeiger (jeder 5 Minuten = 30 Grad)
  let minAngle = map(m, 0, 60, 0, TWO_PI);
  drawArm(minAngle, 200, color(255, 255, 255));
  // Stundenzeiger (jeder 1 Stunde = 30 Grad)
  let hourAngle = map(h + m / 60, 0, 12, 0, TWO_PI);
  drawArm(hourAngle, 120, color(255, 255, 255));
  pop();
}
function drawArm(angle, length, col) {
  push();
  rotate(angle - HALF_PI); // 12 Uhr nach oben
  stroke(col);
  strokeWeight(8);
  line(0, 0, length, 0); // einfacher Zeiger
  pop();
}
function updateSecondBalls() {
  let currentSecond = second();
  let baseAngle = map(currentSecond, 0, 60, 0, TWO_PI);
  let groupIndex = floor(currentSecond / 5); // Gruppe 0–11
  let positionInGroup = currentSecond % 5;
  // Sicherstellen, dass Gruppe existiert
  if (!secondTrailGroups[groupIndex]) {
    secondTrailGroups[groupIndex] = [];
  }
  // Nur einmal pro Sekunde Ball hinzufügen
  if (secondTrailGroups[groupIndex].length <= positionInGroup) {
    let spacing = 20; // Abstand der Bälle
    let radialOffset = groupIndex * 30; // Jede Gruppe ist weiter rechts
    let radialStep = positionInGroup * spacing;
    // Mittelpunkt
    let cx = width / 2;
    let cy = height / 2;
    // Richtung berechnen
    let angle = map(currentSecond, 0, 60, 0, TWO_PI) - HALF_PI;
    // Position berechnen
    let x = cx + cos(angle) * (radialStep + 50); // von innen nach außen
    let y = cy + sin(angle) * (radialStep + 50);
    // Radial versetzen (senkrecht zum Zeiger)
    let offsetAngle = angle + HALF_PI;
    x += cos(offsetAngle) * radialOffset;
    y += sin(offsetAngle) * radialOffset;
    // Ball speichern
    secondTrailGroups[groupIndex].push({ x, y });
  }
  // Zeichnen aller Bälle
  for (let group of secondTrailGroups) {
    if (!group) continue;
    for (let p of group) {
      push();
      noStroke();
      fill(200);
      ellipse(p.x, p.y, 12);
      pop();
    }
  }
}