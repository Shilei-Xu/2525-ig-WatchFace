# Motion Sensor Demo with Ball

## 运行说明

1. 用 mkcert 为你的本地局域网 IP 生成证书：

```bash
mkcert 你的电脑IP
```

2. 启动 HTTPS 服务器：

```bash
npm install
node server.js
```

3. 手机和电脑保持同一局域网，打开：

```
https://你的电脑IP:3000
```

4. 在网页点击“Request Motion Permission”按钮，允许访问重力感应数据。

---

此项目演示了：

- 实时手机重力感应数据驱动的小球移动效果
- 通过 HTTPS 本地服务器安全访问

