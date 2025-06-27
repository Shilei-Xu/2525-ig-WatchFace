const btn = document.getElementById('btnPermission');
const ball = document.getElementById('ball');

let posX = window.innerWidth / 2 - 25;
let posY = window.innerHeight / 2 - 25;
const maxX = window.innerWidth - 50;
const maxY = window.innerHeight - 50;

btn.addEventListener('click', () => {
  if (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  ) {
    DeviceMotionEvent.requestPermission()
      .then((response) => {
        if (response === 'granted') {
          btn.style.display = 'none';
          startMotion();
        } else {
          alert('Permission denied.');
        }
      })
      .catch((e) => {
        alert('Error: ' + e);
      });
  } else {
    btn.style.display = 'none';
    startMotion();
  }
});

function startMotion() {
  window.addEventListener('devicemotion', (event) => {
    let accX = event.accelerationIncludingGravity.x || 0;
    let accY = event.accelerationIncludingGravity.y || 0;

    // 反向调整，手机前倾时小球往下移动，所以 Y 反向
    posX -= accX * 5; 
    posY += accY * 5;

    // 限制边界
    if (posX < 0) posX = 0;
    if (posX > maxX) posX = maxX;
    if (posY < 0) posY = 0;
    if (posY > maxY) posY = maxY;

    ball.style.left = posX + 'px';
    ball.style.top = posY + 'px';
  });
}
