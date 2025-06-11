let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Events = Matter.Events;

let engine;
let world;
let blocks = [];
let pixels = [];

class Block {
    constructor(attributes, options) {
        this.attributes = attributes;
        this.collisionCount = 0; //Collision Detection
        if (this.attributes.shape == 'rect') {
            this.body = Bodies.rectangle(this.attributes.x, this.attributes.y, this.attributes.w, this.attributes.h, options);
        } else {
            this.body = Bodies.circle(this.attributes.x, this.attributes.y, this.attributes.r, options);
        } 
        World.add(world, this.body);
    }

    drawVertices() {
        fill(this.attributes.color);
        beginShape();
        for (const vertice of this.body.vertices) {
            vertex(vertice.x, vertice.y);
        }
        endShape(CLOSE);
    }
}

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('thecanvas');
    document.getElementsByClassName('overlay')[0].style.display = 'none';
    noStroke();
    rectMode(CENTER);
    angleMode(DEGREES);

    engine = Engine.create();
    world = engine.world;

    blocks.push(new Block({ x: 50, y: 0, r: 10, shape: 'circle', color: 'yellow' }, { density: 2.0 ,frictionAir: 0.01 , restitution: 0.9 }))
    
    for (let i = 0; i < 20; i++) {
        blocks.push(new Block({ x: 200 + i * 60, y: 0, r: 80, shape: 'circle', color: 'gray' }, { restitution: 0.9, density: 0.001 }));
    }

    blocks.push(new Block({ x: 1200, y: 0, r: 100, shape: 'circle', color: 'gray' }, { frictionAir: 0  , restitution: 0.9 }))
    blocks.push(new Block({ x: 1200, y: 0, r: 200, shape: 'circle', color: 'gray' }, { frictionAir: 0 , restitution: 0.9 }))
    blocks.push(new Block({ x: 1200, y: 0, r: 150, shape: 'circle', color: 'gray' }, { frictionAir: 0 , restitution: 0.9 }))
    blocks.push(new Block({ x: 1200, y: 0, r: 100, shape: 'circle', color: 'gray' }, { frictionAir: 0 , restitution: 0.9 }))
    blocks.push(new Block({ x: 1200, y: 0, r: 200, shape: 'circle', color: 'gray' }, { frictionAir: 0 , restitution: 0.9 }))
    blocks.push(new Block({ x: 1200, y: 0, r: 150, shape: 'circle', color: 'gray' }, { frictionAir: 0 , restitution: 0.9 }))
    blocks.push(new Block({ x: 1200, y: 0, r: 100, shape: 'circle', color: 'gray' }, { frictionAir: 0 , restitution: 0.9 }))
    blocks.push(new Block({ x: 1200, y: 0, r: 120, shape: 'circle', color: 'gray' }, { frictionAir: 0 , restitution: 0.9 }))
    blocks.push(new Block({ x: 1200, y: 0, r: 100, shape: 'circle', color: 'gray' }, { frictionAir: 0 , restitution: 0.9 }))
 
   
    blocks.push(new Block({ x: 400, y: 500, w: 100, h: 15, shape: 'rect', color: 'green' }, { isStatic: true }))
    blocks.push(new Block({ x: 347, y: 455, w: 15, h: 100, shape: 'rect', color: 'green' }, { isStatic: true , angle : - 0.2 }))
    blocks.push(new Block({ x: 453, y: 455, w: 15, h: 100, shape: 'rect', color: 'green' }, { isStatic: true , angle : 0.2 }))

    blocks.push(new Block({ x: windowWidth / 2, y: windowHeight, w: windowWidth, h:30, shape: 'rect', color: 'gray'},{ isStatic: true }));
    blocks.push(new Block({ x: windowWidth / 2, y: 0, w: windowWidth, h:30, shape: 'rect', color: 'gray'},{ isStatic: true }));
    blocks.push(new Block({ x: 0, y: windowHeight / 2, w: 30, h:windowHeight, shape: 'rect', color: 'gray'},{ isStatic: true }));
    blocks.push(new Block({ x: windowWidth, y: windowHeight / 2, w: 30, h:windowHeight, shape: 'rect', color: 'gray' },{ isStatic: true }));

    // collision
    Matter.Events.on(engine, 'collisionStart', function(event) {
        const pairs = event.pairs;
        for (let pair of pairs) {
            const a = pair.bodyA;
            const b = pair.bodyB;
    
            if ((a === blocks[0].body && isGrayBall(b)) || (b === blocks[0].body && isGrayBall(a))) {
                let grayBall = (a === blocks[0].body) ? b : a;
                explodeBall(grayBall);
            }
        }
    });
    
}


function isGrayBall(body) {
    return blocks.some(block => block.body === body && block.attributes.color === 'gray' && !body.isStatic);
}

function explodeBall(body) {
    const pos = body.position;
    Pixel.boom(pos, 'gray', 4);
    World.remove(world, body);
    blocks = blocks.filter(block => block.body !== body);
    generateGrayBalls(1); // New Grayball
}

function generateGrayBalls(count) {
    for (let i = 0; i < count; i++) {
        let xPos = random(width);
        let yPos = random(height / 2);
        let randomRadius = random(50, 100);
        blocks.push(new Block({ x: xPos, y: yPos, r: randomRadius, shape: 'circle', color: 'gray' }, { restitution: 0.9, density: 0.001 }));
    }
}


function draw() {
    background(40);
    Engine.update(engine);
    blocks.forEach(block => block.drawVertices());
    Pixel.animate();  
}


function keyPressed() {
    switch (key) {
        case 'a':
            Matter.Body.applyForce(blocks[0].body, blocks[0].body.position, { x: -20, y: 0 })
            break
        case 'd':
            Matter.Body.applyForce(blocks[0].body, blocks[0].body.position, { x: 20, y: 0 })
            break;
        case 'w':
            Matter.Body.applyForce(blocks[0].body, blocks[0].body.position, { x: 0, y: -40 })
            break
        case 's':
            Matter.Body.applyForce(blocks[0].body, blocks[0].body.position, { x: 0, y: 20 })
            break;
        case 'ArrowLeft':
            engine.gravity.x = -1;
            break;
        case 'ArrowRight':
            engine.gravity.x = 1;
            break;
        case 'ArrowUp':
            engine.gravity.y = -1;
            break;
        case 'ArrowDown':
            engine.gravity.y = 1;
            break;
        case ' ':
            engine.gravity.x = 0;
            engine.gravity.y = 1;
            break;
    }
}

class Pixel {
    static pixels = [];

    static boom(pos, color, size) {
        for (let i = 0; i < 100; i++) {
            let pixel = new Pixel(pos.x - (i % 2) * 10, pos.y, color, size, 'BOOM')
            pixel.speed.x = 2 - Math.random() * 5;
            pixel.speed.y = 2 - Math.random() * 5;
            this.pixels.push(pixel);
        }
    }

    static animate() {
        this.pixels = this.pixels.filter(p => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height);
        this.pixels.forEach(p => {
            p.straight();
            p.size = Math.max(1, p.size - 0.1);
            p.draw();
        });
    }

    constructor(x, y, color, size, type) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size || 2;
        this.type = type || 'DUST';
        this.a = Math.random() * Math.PI;
        this.r = { x: Math.random() * 3, y: 20 + Math.random() * 10 };
        this.speed = { x: 0, y: 2 + Math.random() * 3 };
        this.dx = 0.7 - Math.random() * 1.4;
        this.ttl = 50 + Math.random() * 50;
    }

    straight() {
        this.x += this.speed.x;
        this.y -= this.speed.y;
    }

    draw() {
        noStroke();
        fill(this.color);
        rect(this.x, this.y, this.size, this.size);
        if (this.ttl-- < 0) {
            this.y = -100;
        }
    }
}