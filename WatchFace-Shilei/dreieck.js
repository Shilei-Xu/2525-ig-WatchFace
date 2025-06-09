
    let baseShape = [];
    let triangles = [];
    let interval = 1000; // 5 seconds
    let lastTime = 0;


    function setup() {
     createCanvas(960, 960);
     baseShape = [
     createVector(width / 2, height / 2 - 100),
     createVector(width / 2 - 100, height / 2 + 100),
     createVector(width / 2 + 100, height / 2 + 100),
     ];
     triangles.push(baseShape);
     noFill();
     stroke(255);
     strokeWeight(1);
     lastTime = millis();  // time initialization
    }


    function draw() {
      background(0);
      drawAllTriangles();

      if (millis() - lastTime > interval) {
        lastTime = millis();
        generateMirror();
      }
    }

    function drawAllTriangles() {
      for (let tri of triangles) {
        beginShape();
        for (let v of tri) {
          vertex(v.x, v.y);
        }
        endShape(CLOSE);
      }
    }

    function generateMirror() {
      let newTriangles = [];
     for (let tri of triangles) {
      // mirror around the center of the canvas
        let mirrorV = tri.map(p => createVector(width - (p.x - width / 2) + width / 2, p.y));
        newTriangles.push(mirrorV);
     }
     triangles = triangles.concat(newTriangles);
     containTriangles();
    }


    function containTriangles() {
      let bounds = getBounds(triangles);
      let scaleX = width / (bounds.maxX - bounds.minX);
      let scaleY = height / (bounds.maxY - bounds.minY);
      let scaleFactor = min(1, 0.95 * min(scaleX, scaleY));

      if (scaleFactor < 1) {
        for (let tri of triangles) {
          for (let v of tri) {
            v.x = (v.x - width / 2) * scaleFactor + width / 2;
            v.y = (v.y - height / 2) * scaleFactor + height / 2;
          }
        }
      }
    }

    function getBounds(tris) {
      let minX = width, minY = height, maxX = 0, maxY = 0;
      for (let tri of tris) {
        for (let v of tri) {
          minX = min(minX, v.x);
          minY = min(minY, v.y);
          maxX = max(maxX, v.x);
          maxY = max(maxY, v.y);
        }
      }
      return { minX, minY, maxX, maxY };
    }
 