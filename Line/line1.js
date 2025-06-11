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

function setup() {
  canvas = createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;
  engine.gravity.y = 0;

  magnetPos = { x: width / 2, y: height / 2 };

  const wallThickness = 50;
  let walls = [
    Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true }),
    Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true }),
    Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
    Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
  ];
  World.add(world, walls);

  // 大白球
  for (let i = 0; i < 3; i++) {
    balls.push(createBall(random(width), random(height), 60, color(255)));
  }

  // 小蓝球
  for (let i = 0; i < 7; i++) {
    balls.push(createBall(random(width), random(height), 20, color(150, 200, 255)));
  }

  // 弹性连接（软约束）
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      let options = {
        bodyA: balls[i].body,
        bodyB: balls[j].body,
        stiffness: 0.0005, // 非常柔软
        length: undefined // 不固定长度，自动使用当前距离
      };
      let constraint = Constraint.create(options);
      World.add(world, constraint);
      constraints.push(constraint);
    }
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

  // 轻微扰动
  balls.forEach(b => {
    let forceMagnitude = 0.01;
    let force = {
      x: (random() - 0.5) * forceMagnitude,
      y: (random() - 0.5) * forceMagnitude
    };
    Body.applyForce(b.body, b.body.position, force);
  });

  // 中心磁性吸引（仅吸大白球）
  if (magnetActive) {
    for (let b of balls) {
      if (b.radius === 60) {
        let dir = {
          x: magnetPos.x - b.body.position.x,
          y: magnetPos.y - b.body.position.y
        };
        let mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
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

    // 可视化磁点
    fill(255, 0, 0);
    noStroke();
    ellipse(magnetPos.x, magnetPos.y, 10, 10);
  }

  // 动态弹性线
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
    magnetActive = true;
  }
}

function createBall(x, y, r, col) {
  let body = Bodies.circle(x, y, r, {
    friction: 0,
    restitution: 1,
    frictionAir: 0.02
  });
  World.add(world, body);
  return { body: body, radius: r, color: col };
}