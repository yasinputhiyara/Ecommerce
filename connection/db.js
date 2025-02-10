const mongoose = require("mongoose");
const connect = mongoose.connect(
  // "mongodb://127.0.0.1:27017/ecommerce"
  // "mongodb+srv://yasinputhiyara:Yasin@123@cluster0.nfpnz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
  "mongodb+srv://yasinputhiyara:Yasin%40123@cluster0.nfpnz.mongodb.net/ecommerce?retryWrites=true&w=majority&appName=Cluster0"
  // { useNewUrlParser: true, useUnifiedTopology: true}
);

connect
  .then(() => {
    console.log("Database Connected");
  })
  .catch((err) => {
    console.log("Database cannot Connect", err);
  });