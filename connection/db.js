const mongoose = require("mongoose");
const connect = mongoose.connect(
  "mongodb://127.0.0.1:27017/ecommerce"
  // { useNewUrlParser: true, useUnifiedTopology: true}
);

connect
  .then(() => {
    console.log("Database Connected");
  })
  .catch((err) => {
    console.log("Database cannot Connect", err);
  });