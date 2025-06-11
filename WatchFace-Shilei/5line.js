let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body;

let engine;
let world;

let polygonPoints = [];
let polygonOffsets = [];
let walls = [];

let balls = [];
let ballRadius = 15;
let spawnInterval = 1000;
let lastSpawnTime = 0;

let attractPoint; // 吸附点

function setup() {
  createCanvas(960, 960);

  engine = Engine.create();
  world = engine.world;

  let centerX = width / 2;
  let centerY = height / 2;
  let radius = 250;

  // 初始化五边形顶点及噪声偏移
  for (let i = 0; i < 5; i++) {
    let angle = TWO_PI / 5 * i - HALF_PI;
    let x = centerX + cos(angle) * radius;
    let y = centerY + sin(angle) * radius;
    polygonPoints.push(createVector(x, y));
    polygonOffsets.push({ x: random(1000), y: random(1000) });
  }

  createWalls();

  // 五边形底部两点索引（按顶点顺序，调整可对应你实际底边）
  let bottomIndex1 = 3;
  let bottomIndex2 = 4;

  attractPoint = createVector(
    (polygonPoints[bottomIndex1].x + polygonPoints[bottomIndex2].x) / 2,
    (polygonPoints[bottomIndex1].y + polygonPoints[bottomIndex2].y) / 2
  );

  Engine.run(engine);
}

function draw() {
  background(255);

  // 漂浮顶点
  for (let i = 0; i < polygonPoints.length; i++) {
    let pt = polygonPoints[i];
    pt.x += map(noise(polygonOffsets[i].x), 0, 1, -0.5, 0.5);
    pt.y += map(noise(polygonOffsets[i].y), 0, 1, -0.5, 0.5);
    polygonOffsets[i].x += 0.01;
    polygonOffsets[i].y += 0.01;
  }

  updateWalls();

  // 画五边形轮廓
  stroke(0);
  strokeWeight(3);
  noFill();
  beginShape();
  for (let pt of polygonPoints) vertex(pt.x, pt.y);
  endShape(CLOSE);

  // 生成小球
  if (millis() - lastSpawnTime > spawnInterval) {
    spawnBall();
    lastSpawnTime = millis();
  }

  // 画吸附区域（半透明蓝色圆）
  let attractRadius = 120;
  fill(0, 100, 255, 50);
  noStroke();
  ellipse(attractPoint.x, attractPoint.y, attractRadius * 2);

  // 对小球施加吸附力和限制
  balls.forEach(ball => {
    let pos = ball.position;
    let distToAttract = dist(pos.x, pos.y, attractPoint.x, attractPoint.y);

    if (distToAttract < attractRadius) {
      // 吸引力改为弱缓慢吸引，主要Y方向向上吸，X方向限制速度
      let forceY = (attractPoint.y - pos.y) * 0.0004; // 轻柔向上吸
      let forceX = (attractPoint.x - pos.x) * 0.0001; // 轻微向中间拉

      Matter.Body.applyForce(ball, pos, { x: forceX, y: forceY });

      // 减缓X轴速度，避免左右过度滚动
      ball.velocity.x *= 0.6;

      // 当靠近底部时减缓Y速度，稳定停住
      if (distToAttract < 20) {
        ball.velocity.y *= 0.2;
        ball.velocity.x *= 0.2;
      }
    }
  });

  // 画所有小球
  fill(255, 0, 0);
  noStroke();
  balls.forEach(b => {
    ellipse(b.position.x, b.position.y, ballRadius * 2);
  });
}

// 创建5条墙，组成五边形边界，墙体加厚40px防止滚落
function createWalls() {
  walls = [];
  let wallThickness = 40;
  for (let i = 0; i < 5; i++) {
    let next = (i + 1) % 5;
    let p1 = polygonPoints[i];
    let p2 = polygonPoints[next];
    let wall = Bodies.rectangle(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2,
      dist(p1.x, p1.y, p2.x, p2.y),
      wallThickness,
      { isStatic: true, friction: 0.1, restitution: 0.8 }
    );
    World.add(world, wall);
    walls.push(wall);
  }
}

// 更新墙体位置与旋转
function updateWalls() {
  for (let i = 0; i < 5; i++) {
    let next = (i + 1) % 5;
    let p1 = polygonPoints[i];
    let p2 = polygonPoints[next];
    let wall = walls[i];

    Body.setPosition(wall, {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    });

    let angle = atan2(p2.y - p1.y, p2.x - p1.x);
    Body.setAngle(wall, angle);

    // 墙长度不变，Matter.js不支持缩放，这里忽略动态调整长度
  }
}

// 在中心附近生成小球
function spawnBall() {
  let pos = {
    x: width / 2 + random(-50, 50),
    y: height / 2 + random(-50, 50)
  };

  let ball = Bodies.circle(pos.x, pos.y, ballRadius, {
    restitution: 0.8,
    friction: 0.01,
    frictionAir: 0.02,
    density: 0.001,
  });

  World.add(world, ball);
  balls.push(ball);
}
