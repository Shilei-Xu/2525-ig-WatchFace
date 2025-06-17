let ball;
let slides = [];
let erster = true;
let hitSound;

//Sound in Script einfügen
function preload() {
  hitSound = loadSound('./Slap-SoundMaster13-49669815.mp3');
  console.log('TestSound')
  hitSound.playMode('sustain');
}


//erzeugt zeichenfläche
function setup() {
  const canvas = createCanvas(960, 960);

  // erzeugt physik engine damit objekte sich realistisch bewegen
  let engine = Matter.Engine.create();
  let world = engine.world;


  // // erstellt 9 plattformen mit einer schleife
  // for (let i = 0; i < 9; i++) {
  //   // alternate x postion and angle based on whether i is even or odd
  //   const x = (i % 2 == 0) ? 250 : 650;
  //   const a = (i % 2 == 0) ? Math.PI * 0.06 : Math.PI * -0.06;
  //   //Erstellt neue block pplattform und fügt sie in slides liste ein
  //   slides.push(
  //     new Block(world, { x: x, y: 200 * (i + 1), w: 800, h: 30, color: 'grey' }, { isStatic: true, angle: a })
  //   );
  // }

  // erstellt  Treppen 
  const stairCount = 60;
  const stairWidth = 270;
  const stairHeight = 20;
  const stepX = 270; // horizontaler Abstand
  const stepY = 150; // vertikaler Abstand
  const baseX = 200;
  const baseY = 300;

  for (let i = 0; i < stairCount; i++) {
    const x = baseX + i * stepX;
    const y = baseY + i * stepY;

    const slide = Matter.Bodies.rectangle(x, y, stairWidth, stairHeight, {
      isStatic: true,
      angle: 0.1,
      label: "slide",
      render: {
        fillStyle: 'purple'
      }
    });

    slide.highlight = false; // Custom property
    slides.push(slide);
    Matter.World.add(world, slide);
  }

  // // Zweite Treppe (nach links)
  // const baseX2 = 3100;
  // const baseY2 = 1900;

  // for (let i = 0; i < stairCount; i++) {
  //   // Spiegelung der Treppe: wir subtrahieren den Schritt statt addieren, sodass sie nach links "fällt"
  //   const x = baseX2 - i * stepX;
  //   const y = baseY2 + i * stepY;

  //   slides.push(
  //     new Block(world, { x: x, y: y, w: stairWidth, h: stairHeight, color: 'grey' }, { isStatic: true, angle: -0.08 }) // negativer Winkel für entgegengesetzte Neigung
  //   );
  // }

  // Ball wird erzeugt
  ball = new Ball(world, { x: 100, y: 50, r: 40, color: 'white' }, { restitution: 0.7, label: "ball" });

  //ball speed 
  Matter.Body.setVelocity(ball.body, { x: 5, y: 0 });

//Kollision mit Stufe
  Matter.Events.on(engine, 'collisionStart', function(event) {
  event.pairs.forEach(function(pair) {
    const bodyA = pair.bodyA;
    const bodyB = pair.bodyB;
    console.log('Collision:', bodyA.label, bodyB.label);

    //SOund bei Kollision
    const labels = [bodyA.label, bodyB.label];
    if (labels.includes("ball") && labels.includes("slide")) {
      console.log('Playing sound!');
      hitSound.play();
    }
    // Aufleuchten
    const slide = bodyA.label === "slide" ? bodyA : bodyB;
    slide.highlight = true;
    setTimeout(() => {
      slide.highlight = false;
    }, 200);
  });
});
  
  // Startet physik simulation
  Matter.Runner.run(engine);
}

function draw() {
  //zoomt die kamera je nachdem wo die maus ist
  const zoom = map(mouseX, 0, width, 0.5, 2)
  //Berechnet wie kamera ball folgt (in der mitte hält)
  const shiftX = -ball.body.position.x * zoom + width / 2;
  const shiftY = -ball.body.position.y * zoom + height / 2;

  // console.log(shiftX, shiftY)
  //speichert mit push
  push()
  //verschiebt und zoomt die ansicht damit kamera ball folgt
  translate(shiftX, shiftY)
  scale(zoom)
  //hintergrund schwarz
  background(0);

  //Zeichnet plattform und ball
  for (let s of slides) {
    push();
    translate(s.position.x, s.position.y);
    rotate(s.angle);
    rectMode(CENTER);
    noStroke();
    fill(s.highlight ? 'yellow' : 'grey');
    rect(0, 0, 270, 20); // Nutze die Werte, die du beim Erstellen benutzt hast
    pop();
  }
  
  ball.draw();
  pop()
  //stellt zeichen einstellungen (kamera, Zoom) zurück

  // Kontinuierlicher Schubs
  Matter.Body.applyForce(ball.body, ball.body.position, { x: 0.0005, y: 0 });

  // speed wechsel bei treppen wechsel
  // if (ball.body.position.y < 1800) {
  //   Matter.Body.applyForce(ball.body, ball.body.position, { x: 0.0005, y: 0 });
  // }
  // else {
  //   // if erster wechsel
  //   if (erster) {
  //     erster = false;
  //     Matter.Body.setVelocity(ball.body, { x: -5, y: 0 });
  //   }
  //   Matter.Body.applyForce(ball.body, ball.body.position, { x: -0.0005, y: 0 });
  // }

  //wenn ball an der position angekommen, dann soll wieder von anfang an
  if (ball.body.position.y > 9200) {
    Matter.Body.setPosition(ball.body, {x: 150, y: 150});
    Matter.Body.setVelocity(ball.body, { x: 5, y: 0 });
  }
}