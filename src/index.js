const express = require("express");
const app = express();
let http = require("http");
const { MLServices } = require("./features/MachineLearning/service");
let websockets = require('./features/websocket');


let server = http.createServer(app, (req, res) => {
  console.log(new Date() + " received request for " + req.url);
  res.writeHead(404);
  res.end();
});

app.get("/", (req, res) => {
  res.send("hello world");
});

server.listen(8000, () => {
  console.log(new Date() + " Server is running on port 8000");
});

websockets(server);
