const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RequestSchema = new Schema(
  {
    firstName: { type: String, required: true, lowercase: true, trim: true },
    lastName: { type: String, required: true, lowercase: true, trim: true },
    id: {
      type: String,
      required: true,
      trim: true,
    },
    reason: { type: String, trim: true, lowercase: true },
    mobile: { type: Number, required: true, trim: true },
    reqFor: { type: Schema.Types.ObjectId, required: true, ref: "resident" },
    status: { type: String, default: "pending" },
    image: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

const Request = mongoose.model("request", RequestSchema);
module.exports = Request;
