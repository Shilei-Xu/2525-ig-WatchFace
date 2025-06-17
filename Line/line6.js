let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Constraint = Matter.Constraint,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint;

let engine, world;
let balls = [];
let constraints = [];
let canvas;
let mouseConstraint;

let magnetActive = false;
let magnetPos;
let ringRadius = 300;
let blueBallCount = 0;
let lastBlueBallTime = 0;
let maxBlueBalls = 60;
let baseWhiteBalls = [];
let baseBlueBalls = [];

function setup() {
  // 创建画布和物理引擎
  canvas = createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;
  engine.gravity.y = 0;
  // 初始化磁铁位置
  magnetPos = { x: width / 2, y: height / 2 };

  const wallThickness = 50;
  let walls = [
    Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true }),
    Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true }),
    Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
    Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
  ];
  World.add(world, walls);

  // 白球
  for (let i = 0; i < 3; i++) {
    let b = createBall(random(width), random(height), 60, color(255));
    balls.push(b);
    baseWhiteBalls.push(b);
  }

  // 初始蓝球
  for (let i = 0; i < 7; i++) {
    addBlueBall();
  }

  // 鼠标控制
  let canvasMouse = Mouse.create(canvas.elt);
  canvasMouse.pixelRatio = pixelDensity();
  let options = {
    mouse: canvasMouse,
    constraint: {
      stiffness: 0.2,
      render: { visible: false }
    }
  };
  mouseConstraint = MouseConstraint.create(engine, options);
  World.add(world, mouseConstraint);
}

function draw() {
  background(0);
  Engine.update(engine);

  // 每秒添加一个蓝球
  if (millis() - lastBlueBallTime > 1000) {
    if (blueBallCount < maxBlueBalls) {
      addBlueBall();
    } else {
      resetBlueBalls();
    }
    lastBlueBallTime = millis();
  }

  // 扰动（磁性关闭时允许扰动）
  if (!magnetActive) {
    balls.forEach(b => {
      let forceMagnitude = 0.01;
      let force = {
        x: (random() - 0.5) * forceMagnitude,
        y: (random() - 0.5) * forceMagnitude
      };
      Body.applyForce(b.body, b.body.position, force);
    });
  }

  // 磁性吸附逻辑
  if (magnetActive) {
    let angleStep = TWO_PI / baseBlueBalls.length;

    // 大球吸向中心，保持动态
    for (let b of balls) {
      if (b.radius === 60) {
        let pos = b.body.position;
        let dir = {
          x: magnetPos.x - pos.x,
          y: magnetPos.y - pos.y
        };
        let mag = sqrt(dir.x * dir.x + dir.y * dir.y);
        if (mag > 1) {
          dir.x /= mag;
          dir.y /= mag;
          let strength = 0.15;
          Body.applyForce(b.body, b.body.position, {
            x: dir.x * strength,
            y: dir.y * strength
          });
        }
      }
    }

    // 蓝球吸附到圆环，距离小于阈值后静止
    baseBlueBalls.forEach((b, i) => {
      let pos = b.body.position;
      let angle = -HALF_PI + angleStep * i;
      let targetX = magnetPos.x + ringRadius * cos(angle);
      let targetY = magnetPos.y + ringRadius * sin(angle);

      let dir = {
        x: targetX - pos.x,
        y: targetY - pos.y
      };
      let distToTarget = sqrt(dir.x * dir.x + dir.y * dir.y);

      if (distToTarget > 3) {
        // 距离较远，继续吸附
        dir.x /= distToTarget;
        dir.y /= distToTarget;
        let strength = 0.02;
        Body.applyForce(b.body, b.body.position, {
          x: dir.x * strength,
          y: dir.y * strength
        });
        // 确保动态
        if (b.body.isStatic) {
          b.body.isStatic = false;
        }
      } else {
        // 靠近则静止
        Body.setPosition(b.body, { x: targetX, y: targetY });
        Body.setVelocity(b.body, { x: 0, y: 0 });
        Body.setAngularVelocity(b.body, 0);
        b.body.isStatic = true;
      }
    });

    /* // 绘制中心点和圆环
    fill(255, 0, 0);
    noStroke();
    ellipse(magnetPos.x, magnetPos.y, 10);

    noFill();
    stroke(100, 100, 255, 80);
    strokeWeight(1.5);
    ellipse(magnetPos.x, magnetPos.y, ringRadius * 2);
  } else { */
    
    
    // 磁性关闭，蓝球恢复动态并赋随机速度
    baseBlueBalls.forEach(b => {
      if (b.body.isStatic) {
        b.body.isStatic = false;
        let angle = random(TWO_PI);
        let speed = random(1, 3);
        Body.setVelocity(b.body, {
          x: cos(angle) * speed,
          y: sin(angle) * speed
        });
      }
    });
  }

  // 绘制绳子
  stroke(100, 150, 255, 100);
  strokeWeight(2);
  for (let c of constraints) {
    let posA = c.bodyA.position;
    let posB = c.bodyB.position;
    line(posA.x, posA.y, posB.x, posB.y);
  }

  // 绘制球
  noStroke();
  for (let b of balls) {
    fill(b.color);
    ellipse(b.body.position.x, b.body.position.y, b.radius * 2);
  }
}

function mousePressed() {
  let clickedOnBall = balls.some(b => {
    let d = dist(mouseX, mouseY, b.body.position.x, b.body.position.y);
    return d < b.radius;
  });

  if (!clickedOnBall) {
    magnetActive = !magnetActive;

    // 更新绳子弹性
    for (let c of constraints) {
      c.stiffness = magnetActive ? 0 : 0.02;
    }
  }
}

function createBall(x, y, r, col) {
  let body = Bodies.circle(x, y, r, {
    friction: 0,
    restitution: 0.1,
    frictionAir: 0.8,
  });
  World.add(world, body);
  return { body: body, radius: r, color: col };
}

function addBlueBall() {
  let x, y;

  if (magnetActive) {
    // 永远从顶点生成（正上方）
    let angle = -HALF_PI;
    x = magnetPos.x + ringRadius * cos(angle);
    y = magnetPos.y + ringRadius * sin(angle);
  } else {
    // 自由生成
    x = random(width);
    y = random(height);
  }

  let b = createBall(x, y, 20, color(150, 200, 255));
  balls.push(b);
  baseBlueBalls.push(b);
  blueBallCount++;


  // 与所有白球建立连接
  for (let w of baseWhiteBalls) {
    let c = Constraint.create({
      bodyA: b.body,
      bodyB: w.body,
      stiffness: magnetActive ? 0 : 0.05,
      length: undefined
    });
    World.add(world, c);
    constraints.push(c);
  }

  // 如果磁性开启，让小球立即静止（吸附后保持稳定）
  if (magnetActive) {
    Body.setVelocity(b.body, { x: 50, y: 0 });
    Body.setAngularVelocity(b.body, 0);
  }
}


function resetBlueBalls() {
  for (let b of baseBlueBalls) {
    World.remove(world, b.body);
  }
  baseBlueBalls = [];
  balls = baseWhiteBalls.slice(); // 保留白球
  constraints.forEach(c => World.remove(world, c));
  constraints = [];
  blueBallCount = 0;

  // 重新连接白球和蓝球
  for (let i = 0; i < 7; i++) {
    addBlueBall();
  }
}
