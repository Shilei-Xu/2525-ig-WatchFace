let engine;
let world;
let stairs = [];
let ball;
const stairCount = 15; // 减少楼梯数量确保可见

function setup() {
  createCanvas(960, 960);
  
  // 创建物理引擎
  engine = Matter.Engine.create();
  world = engine.world;
  
  // 创建楼梯
  createStairs();
  
  // 创建球体
  ball = Matter.Bodies.circle(200, 100, 30, {
    restitution: 0.7,
    render: { fillStyle: '#ff0000' }
  });
  Matter.World.add(world, ball);
  
  // 运行物理引擎
  Matter.Runner.run(engine);
  
  // 初始视角调整
  Matter.Render.lookAt(engine.render, {
    min: { x: 0, y: 0 },
    max: { x: width, y: height }
  });
}

function createStairs() {
  // 清除现有楼梯
  stairs.forEach(step => Matter.World.remove(world, step));
  stairs = [];
  
  const stairWidth = 150;
  const stairHeight = 20;
  const stepX = 120;
  const stepY = 80;
  
  // 创建更明显的楼梯布局
  for (let i = 0; i < stairCount; i++) {
    const x = 100 + i * stepX;
    const y = 300 + i * stepY; // 降低起始Y位置
    
    const stair = Matter.Bodies.rectangle(x, y, stairWidth, stairHeight, {
      isStatic: true,
      angle: 0.3, // 增大倾斜角度
      render: {
        fillStyle: '#3498db',
        strokeStyle: '#2980b9',
        lineWidth: 1
      },
      chamfer: { radius: 5 }
    });
    
    stairs.push(stair);
    Matter.World.add(world, stair);
  }
}

function draw() {
  background(240);
  
  // 绘制楼梯 - 更明显的视觉效果
  stairs.forEach(stair => {
    push();
    translate(stair.position.x, stair.position.y);
    rotate(stair.angle);
    
    fill(52, 152, 219);
    stroke(41, 128, 185);
    strokeWeight(2);
    
    // 绘制楼梯主体
    rect(0, 0, stair.width, stair.height, 5);
    
    // 添加防滑纹路
    fill(255, 255, 255, 150);
    for(let x = -stair.width/2 + 10; x < stair.width/2; x += 20) {
      rect(x, 0, 10, 3);
    }
    
    pop();
  });
  
  // 绘制球体
  fill(255, 0, 0);
  noStroke();
  ellipse(ball.position.x, ball.position.y, 60);
  
  // 缓慢移动楼梯（调试时可注释掉）
  stairs.forEach(stair => {
    Matter.Body.translate(stair, {
      x: -0.5, // 减慢移动速度
      y: -0.2
    });
    
    // 循环楼梯位置
    if (stair.position.x < -stair.width) {
      Matter.Body.setPosition(stair, {
        x: width + stair.width/2,
        y: random(height/2, height - 100)
      });
    }
  });
  
  // 显示调试信息
  fill(0);
  textSize(16);
  text(`楼梯数量: ${stairs.length}  球体位置: (${ball.position.x.toFixed(0)}, ${ball.position.y.toFixed(0)})`, 20, 30);
}

function mousePressed() {
  // 点击时重置球体位置
  Matter.Body.setPosition(ball, { x: 200, y: 100 });
  Matter.Body.setVelocity(ball, { x: 0, y: 0 });
}