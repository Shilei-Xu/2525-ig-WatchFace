/* const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = 3000;

const options = {
  key: fs.readFileSync('172.20.64.108-key.pem'),
  cert: fs.readFileSync('172.20.64.108.pem'),
};

app.use(express.static(path.join(__dirname)));

https.createServer(options, app).listen(PORT, () => {
  console.log(`HTTPS server running at https://172.20.64.108:${PORT}`);
});
 */
const os = require('os');
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = 3000;

// 获取当前本地 IPv4 地址
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const ip = getLocalIPAddress();

const certPath = path.join(__dirname, `${ip}.pem`);
const keyPath = path.join(__dirname, `${ip}-key.pem`);

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error(`证书文件未找到: ${certPath} 或 ${keyPath}`);
  process.exit(1);
}

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

app.use(express.static(path.join(__dirname)));

https.createServer(options, app).listen(PORT, () => {
  console.log(`✅ HTTPS 服务器运行中: https://${ip}:${PORT}`);
});
