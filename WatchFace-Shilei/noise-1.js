let theShader;

const vertShader = `
attribute vec3 aPosition;
void main() {
  gl_Position = vec4(aPosition, 1.0);
}
`;

const fragShader = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

vec2 random2(vec2 p) {
  return fract(sin(vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  )) * 43758.5453);
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;  // 归一化到0~1
  st.x *= u_resolution.x / u_resolution.y;      // 调整长宽比

  st *= 3.0;
  vec2 i_st = floor(st);
  vec2 f_st = fract(st);

  float m_dist = 1.0;
  float second_dist = 1.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = random2(i_st + neighbor);
      point = 0.5 + 0.5 * sin(u_time * 0.3 + 6.2831 * point);
      vec2 diff = neighbor + point - f_st;
      float dist = length(diff);

      if (dist < m_dist) {
        second_dist = m_dist;
        m_dist = dist;
      } else if (dist < second_dist) {
        second_dist = dist;
      }
    }
  }

  float edge = second_dist - m_dist;
  float border = step(0.01, edge);

  gl_FragColor = vec4(vec3(1.0 - border), 1.0);
}
`;

function setup() {
  createCanvas(960, 960, WEBGL);
  noStroke();
  theShader = createShader(vertShader, fragShader);
  shader(theShader);
}

function draw() {
  theShader.setUniform('u_resolution', [width * 1.0, height * 1.0]);
  theShader.setUniform('u_time', millis() / 1000);
  rect(-width / 2, -height / 2, width, height);
}

function windowResized() {
  resizeCanvas(960, 960);
}
