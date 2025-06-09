const Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies;

let engine, world;

let scl = 10;
let cols, rows;
let inc = 0.1;
let zoff = 0;
let flowfield = [];

let particles = [];

let svgData;
let digitPoints = [];

let t = 0;

function preload() {
  svgData = loadSVG('line.svg'); // ⬅️ 确保路径正确
  console.log(svgData);
}

function setup() {
  createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;

  cols = floor(width / scl);
  rows = floor(height / scl);
  flowfield = new Array(cols * rows);

  extractPointsFromSVG(svgData);

  for (let i = 0; i < 300; i++) { // 可调节数量
    particles.push(new Particle());
  }

  background(0);
}

function draw() {
  Engine.update(engine);
  generateFlowField();

  for (let p of particles) {
    p.follow(flowfield);
    p.update();
    p.edges();
    p.show();
  }

  if (t < 1) t += 0.002;
}

function extractPointsFromSVG(svg) {
  digitPoints = [];
  for (let path of svg.paths) {
    let vertices = Matter.Vertices ? Matter.Svg.pathToVertices(path.elt, 10) : [];
    for (let v of vertices) {
      digitPoints.push(createVector(v.x, v.y));
    }
  }
}

function generateFlowField() {
  let yoff = 0;
  for (let y = 0; y < rows; y++) {
    let xoff = 0;
    for (let x = 0; x < cols; x++) {
      let index = x + y * cols;

      let angle = noise(xoff, yoff, zoff) * TWO_PI * 4;
      let v = p5.Vector.fromAngle(angle);
      v.setMag(1);

      let pos = createVector(x * scl + scl / 2, y * scl + scl / 2);

      if (digitPoints.length > 0) {
        let attractVec = getNearestDigitVec(pos);
        v = p5.Vector.lerp(v, attractVec, t);
        v.setMag(1);
      }

      flowfield[index] = v;
      xoff += inc;
    }
    yoff += inc;
  }
  zoff += 0.002;
}

function getNearestDigitVec(pos) {
  let minDist = Infinity;
  let closest = null;
  for (let pt of digitPoints) {
    let d = dist(pos.x, pos.y, pt.x, pt.y);
    if (d < minDist) {
      minDist = d;
      closest = pt;
    }
  }
  if (closest) {
    let dir = p5.Vector.sub(closest, pos);
    dir.normalize();
    return dir;
  } else {
    return createVector(0, 0);
  }
}

function Particle() {
  this.pos = createVector(random(width), random(height));
  this.vel = createVector(0, 0);
  this.acc = createVector(0, 0);
  this.maxspeed = 4;
  this.prevPos = this.pos.copy();

  this.update = function () {
    this.vel.add(this.acc);
    this.vel.limit(this.maxspeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
  };

  this.applyForce = function (force) {
    this.acc.add(force);
  };

  this.follow = function (vectors) {
    let x = floor(this.pos.x / scl);
    let y = floor(this.pos.y / scl);
    let index = x + y * cols;
    let force = vectors[index];
    if (force) this.applyForce(force);
  };

  this.show = function () {
    stroke(255, 50);
    strokeWeight(1);
    line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);
    this.updatePrev();
  };

  this.updatePrev = function () {
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;
  };

  this.edges = function () {
    if (this.pos.x > width) { this.pos.x = 0; this.updatePrev(); }
    if (this.pos.x < 0) { this.pos.x = width; this.updatePrev(); }
    if (this.pos.y > height) { this.pos.y = 0; this.updatePrev(); }
    if (this.pos.y < 0) { this.pos.y = height; this.updatePrev(); }
  };
}
