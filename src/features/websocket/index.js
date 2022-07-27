let WebSocketServer = require("websocket").server;
const { MLServices } = require("../MachineLearning/service");

module.exports = async (expressServer) => {
  let wsServer = new WebSocketServer({
    httpServer: expressServer,
  });

  let ml = new MLServices();

  async function run() {
    ml.ReadFile();
    ml.ComputeSMA();
    await ml.TrainModel();
  }

  const clients = {};

  // Generates unique userid for every user.
  const generateUniqueID = () => {
    const s4 = () =>
      Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);

    return s4() + "-" + s4() + "-" + s4();
  };

  wsServer.on("request", function (request) {
    var userID = generateUniqueID();

    console.log(
      new Date() +
        " Recieved a new connection from origin " +
        request.origin +
        "."
    );

    // You can rewrite this part of the code to accept only the requests from allowed origin
    const connection = request.accept(null, request.origin);
    console.log("request.origin", request.origin);

    connection.on("message", async function (message) {
      let result;
      if ((message.type = "utf8")) {
        console.log("Received message: " + message.utf8Data);
        const data = JSON.parse(message.utf8Data);

        if(data.type === 'train'){
          let sSend = {
            type: "msg",
            msg: 'Retrain model...Pls wait',
            status: false
          }

          connection.send(JSON.stringify(sSend));

          await run();

          sSend.msg = "Completed. Now you can predict the model"
          sSend.status = true;

          connection.send(JSON.stringify(sSend));
        }

        if (data.type === "predict") {
          // result = await ml.Predict();
          // connection.sendUTF(result);
          result = await ml.predictSensorData();
          let sSend = {
            type: 'predict',
            msg: 'Result: ' + result,
            status: 1
          }
          connection.send(JSON.stringify(sSend));
        }

        if (data.type === "predictTest") {
          result = await ml.Predict();
          let sSend = {
            type: 'predictTest',
            msg: 'Test result: ' + result,
            status: 1
          }
          connection.send(JSON.stringify(sSend));
        }

      } else if (message.type === "binary") {
        console.log(
          "Received Binary Message of " + message.binaryData.length + " bytes"
        );
        connection.sendBytes(message.binaryData);
      }
    });

    connection.on("close", function (reasonCode, description) {
      console.log(
        new Date() + " Peer " + connection.remoteAddress + " disconnected."
      );
    });

    clients[userID] = connection;
    console.log("connected: " + userID);
  });
  return wsServer;
};
