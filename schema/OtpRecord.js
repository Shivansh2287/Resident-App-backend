const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OtpSchema = new Schema({
  number: { type: Number, trim: true },
  otp: { type: Number, trim: true },
  createdAt: { type: Date, expires: "2m", default: Date.now },
});

const OTP = mongoose.model("otp", OtpSchema);
module.exports = OTP;
