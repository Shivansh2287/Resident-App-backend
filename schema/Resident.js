const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ResidentSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, lowercase: true },
    lastName: { type: String, required: true, trim: true, lowercase: true },
    flat: { type: String, required: true, trim: true },
    mobile: { type: Number, required: true, trim: true, unique: true },
    email: { type: String, trim: true, lowercase: true },
    image: { type: String, trim: true, lowercase: true },
    building: { type: String, required: true, trim: true, lowercase: true },
    society: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    requests: [{ type: Schema.Types.ObjectId, ref: "request" }],
    verified: { type: Boolean, required: true, default: true },
    emailVerified: { type: Boolean, default: false },
    pushToken: { type: String, trim: true },
    password: { type: String, trim: true, required: true },
    otp: { type: Number, trim: true },
  },
  {
    timestamps: true,
  }
);

const Resident = mongoose.model("resident", ResidentSchema);
module.exports = Resident;
