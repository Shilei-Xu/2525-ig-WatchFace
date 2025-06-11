let cellSize = 60;
let cols, rows;
let basePoints = [];

function setup() {
  createCanvas(480, 480);
  cols = floor(width / cellSize) + 2;
  rows = floor(height / cellSize) + 2;
  
  // 生成基础格点中心位置（不带动画偏移）
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let px = x * cellSize;
      let py = y * cellSize;
      basePoints.push(createVector(px, py));
    }
  }
  pixelDensity(1);
  noStroke();
}

function draw() {
  background(0);
  loadPixels();
  
  let time = millis() / 1000;
  
  // 动态计算当前点位置（正弦波偏移）
  function animatedPoint(i) {
    let base = basePoints[i];
    let offsetX = 20 * sin(time + i * 0.3);
    let offsetY = 20 * cos(time + i * 0.3);
    return createVector(base.x + offsetX, base.y + offsetY);
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let gx = floor(x / cellSize);
      let gy = floor(y / cellSize);
      
      // 找附近的点，计算距离
      let dists = [];
      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
          let px = gx + nx;
          let py = gy + ny;
          if (px >= 0 && px < cols && py >= 0 && py < rows) {
            let idx = py * cols + px;
            let pt = animatedPoint(idx);
            let d = dist(x, y, pt.x, pt.y);
            dists.push(d);
          }
        }
      }
      dists.sort((a,b) => a - b);
      
      let edgeVal = dists[1] - dists[0];
      // 距离差小，说明在边缘，画白色；否则黑色
      let c = edgeVal < 5 ? 255 : 0;
      
      let pix = (y * width + x) * 4;
      pixels[pix] = c;
      pixels[pix + 1] = c;
      pixels[pix + 2] = c;
      pixels[pix + 3] = 255;
    }
  }
  
  updatePixels();
}
