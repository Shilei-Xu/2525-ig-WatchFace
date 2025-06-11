
const Engine = Matter.Engine,
      Render = Matter.Render,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Vector = Matter.Vector;

let engine;
let world;

let walls = [];
let balls = [];

const sides = 5;
const radius = 300;
const wallThickness = 20;

function setup() {
  createCanvas(960, 960);

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 1;

  createPolygonWalls(sides, radius);

  Engine.run(engine);
}

function draw() {
  background(34);

  // 画边框墙
  fill(255);
  noStroke();
  for (let wall of walls) {
    push();
    translate(wall.position.x, wall.position.y);
    rotate(wall.angle);
    rectMode(CENTER);
    rect(0, 0, wall.bounds.max.x - wall.bounds.min.x, wallThickness);
    pop();
  }

  // 画小球
  fill(200, 50, 50);
  noStroke();
  for (let ball of balls) {
    ellipse(ball.position.x, ball.position.y, ball.circleRadius * 2);
  }

  // 1秒生成一个小球（限制最多10个）
  if (frameCount % 60 === 0 && balls.length < 1000) {
    let ball = Bodies.circle(width / 2, height / 2, 15, {
      restitution: 0.8,
      friction: 0.01,
      density: 0.001
    });
    balls.push(ball);
    World.add(world, ball);
  }
}

// 创建多边形边框（sides边，radius半径）
function createPolygonWalls(sides, radius) {
  let center = { x: width / 2, y: height / 2 };
  walls = [];
  for (let i = 0; i < sides; i++) {
    let angle1 = TWO_PI * i / sides - PI / 2;
    let angle2 = TWO_PI * (i + 1) / sides - PI / 2;

    let x1 = center.x + radius * cos(angle1);
    let y1 = center.y + radius * sin(angle1);
    let x2 = center.x + radius * cos(angle2);
    let y2 = center.y + radius * sin(angle2);

    let length = dist(x1, y1, x2, y2);

    let wall = Bodies.rectangle(
      (x1 + x2) / 2,
      (y1 + y2) / 2,
      length,
      wallThickness,
      { isStatic: true, friction: 0.5 }
    );

    let angle = atan2(y2 - y1, x2 - x1);
    Body.setAngle(wall, angle);

    walls.push(wall);
    World.add(world, wall);
  }
}
