const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = 3000;

const options = {
  key: fs.readFileSync('192.168.1.88-key.pem'),
  cert: fs.readFileSync('192.168.1.88.pem'),
};

app.use(express.static(path.join(__dirname)));

https.createServer(options, app).listen(PORT, () => {
  console.log(`HTTPS server running at https://192.168.1.88:${PORT}`);
});
