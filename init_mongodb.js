const mongoose = require("mongoose");

const connectDB = async () => {
  mongoose
    .connect(process.env.DB_URI, {
      dbName: "residents",
      useUnifiedTopology: false,
      minPoolSize: 50,
      socketTimeoutMS: 300000,
      bufferCommands: false,
      tls: true,
      compressors: "zlib",
      zlibCompressionLevel: 1,
      family: 4,
      serverSelectionTimeoutMS: 3000,
      keepAlive: true,
      keepAliveInitialDelay: 300000,
    })
    .catch((err) => console.log(err));

  mongoose.connection.on("connected", () => {
    console.log("Mongoose connected to residents DB");
  });

  mongoose.connection.on("error", (err) => {
    console.log(err.message);
  });
  mongoose.connection.on("reconnected", () => {
    console.log("mongodb reconnected");
  });

  mongoose.connection.on("disconnected", () => {
    console.log("Mongoose connection is disconnected.");
  });

  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
};

module.exports = { connectDB };
