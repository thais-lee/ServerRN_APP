const { makePredictions, trainModel } = require("./model");
const fs = require("fs");
const axios = require("axios").default;

class MLServices {
  constructor() {
    this.window_size = 30;
    this.training_size = 98;
    this.result = {
      model: 0,
    };
  }

  ReadFile() {
    let data_file_raw = fs.readFileSync(__dirname + "/Hanoi.csv", "utf8");
    data_file_raw = data_file_raw.split("\n");
    this.columnName = data_file_raw[0].split(",");
    let data = data_file_raw.slice(1);
    data = data.slice(0, -1);
    this.date = data.map((line) => {
      const values = line.split(",");
      return values[1];
    });

    this.temperatures = data.map((line) => {
      const values = line.split(",");
      return +values[2];
    });

    let data_raw = [];
    data_raw = data.map((d) => {
      const values = d.split(",");
      const obj = {
        date: values[1],
        temp: parseFloat(values[2]),
      };
      return obj;
    });
    this.data_raw = data_raw;
  }

  ComputeSMA() {
    let r_avgs = [];
    let avg_prev;
    let window_size = this.window_size;
    let len = this.data_raw.length;

    for (let i = 0; i <= len - window_size; i++) {
      let curr_avg = 0.0,
        t = i + window_size;
      for (let k = i; k < t && k <= len; k++) {
        curr_avg += this.data_raw[k]["temp"] / window_size;
      }
      r_avgs.push({
        set: this.data_raw.slice(i, i + window_size),
        avg: curr_avg,
      });
      avg_prev = curr_avg;
    }
    this.sma_vec = r_avgs;
  }

  initDataset() {
    this.GenerateDataset();
    this.ComputeSMA();
  }

  async TrainModel() {
    let epoch_loss = [];
    let inputs = this.sma_vec.map((inp_f) => {
      return inp_f["set"].map((val) => val["temp"]);
    });

    let outputs = this.sma_vec.map((outp_f) => outp_f["avg"]);

    const trainSize = this.training_size;
    let n_epochs = 10;
    let l_r = 0.01;
    let hid_lay = 4;

    inputs = inputs.slice(0, Math.floor((trainSize / 100) * inputs.length));
    outputs = outputs.slice(0, Math.floor((trainSize / 100) * outputs.length));

    let callback = (epoch, log) => {
      epoch_loss.push(log.loss);
      console.log("loss", log.loss);
    };

    this.result = await trainModel(
      inputs,
      outputs,
      this.window_size,
      n_epochs,
      l_r,
      hid_lay,
      callback
    );
  }

  async Predict() {
    let inputs = this.sma_vec.map((inp_f) => {
      return inp_f["set"].map((val) => val["temp"]);
    });

    let pred_X = [inputs[inputs.length - 1]];
    pred_X = pred_X.slice(
      Math.floor((this.training_size / 100) * pred_X.length),
      pred_X.length
    );

    let pred_Y = makePredictions(
      pred_X,
      this.result["model"],
      this.result["normalize"]
    );

    let timestamp_d = this.data_raw
      .map((val) => val["date"])
      .splice(this.data_raw.length - this.window_size, this.data_raw.length);

    let last_date = new Date(timestamp_d[timestamp_d.length - 1] + "Z");
    last_date.setHours(last_date.getHours() + 1);
    let nextDate = last_date.toISOString();

    return "Predicted: Time-" + nextDate + " Temp- " + pred_Y;
  }

  async predictSensorData() {
    //get last 30 record from "thing speak"
    const raw_data = await axios.get(
      "https://api.thingspeak.com/channels/1709568/fields/1.json?results=30&timezone=Asia/Bangkok"
    );

    const feeds = raw_data.data["feeds"];
    const inputs = feeds.map((e) => +e["field1"]);
    const pred_X = [inputs];

    //string
    const sLast_date = feeds[feeds.length - 1]["created_at"];
    //Date
    const dLast_date = new Date(sLast_date);

    //pred temperature after 10 minutes
    dLast_date.setMinutes(dLast_date.getMinutes() + 10);
    const pred_Date = dLast_date.toLocaleString('en-US', {timeZone: "Asia/Bangkok"});

    let pred_Y = makePredictions(
      pred_X,
      this.result["model"],
      this.result["normalize"]
    );

    return "Predicted: Time- " + pred_Date + " Temp- " + pred_Y;
  }
}

module.exports = { MLServices };
