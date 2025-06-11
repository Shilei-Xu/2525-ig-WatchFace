let handSec;
let handMin;
let handHour;
let center;

// 定义 Block 类
class Block {
  constructor(world, attributes, options = {}) {
    this.w = attributes.w;
    this.h = attributes.h;
    this.color = attributes.color;
    
    this.body = Matter.Bodies.rectangle(
      attributes.x, 
      attributes.y, 
      attributes.w, 
      attributes.h, 
      options
    );
    Matter.World.add(world, this.body);
  }
  
  rotate(angle, point) {
    Matter.Body.setAngle(this.body, angle);
    Matter.Body.setPosition(this.body, point);
  }
  
  draw() {
    push();
    translate(this.body.position.x, this.body.position.y);
    rotate(this.body.angle);
    rectMode(CENTER);
    fill(this.color);
    rect(0, 0, this.w, this.h);
    pop();
  }
}

function setup() {
  const canvas = createCanvas(600, 600);
  center = { x: width / 2, y: height / 2 };

  // create an engine
  let engine = Matter.Engine.create();
  let world = engine.world;

  // handles of the clock
  handSec = new Block(world, 
    { w: 5, h: 300, x: center.x, y: center.y - 150, color: 'white' }, 
    { isStatic: true });
  handMin = new Block(world, 
    { w: 10, h: 250, x: center.x, y: center.y - 125, color: 'white' }, 
    { isStatic: true });
  handHour = new Block(world, 
    { w: 15, h: 200, x: center.x, y: center.y - 100, color: 'white' }, 
    { isStatic: true });

  // run the engine
  Matter.Runner.run(engine);
}

function draw() {
  background('black');

  const angleSec = map(second(), 0, 60, 0, TWO_PI);
  const angleMin = map(minute(), 0, 60, 0, TWO_PI);
  const angleHour = map(hour(), 0, 12, 0, TWO_PI);

  handSec.rotate(angleSec, { x: center.x, y: center.y });
  handMin.rotate(angleMin, { x: center.x, y: center.y });
  handHour.rotate(angleHour, { x: center.x, y: center.y });

  handSec.draw();
  handMin.draw();
  handHour.draw();
}