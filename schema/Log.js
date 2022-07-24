const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "resident" },
    accepted: [{ type: Schema.Types.ObjectId, ref: "request" }],
    rejected: [{ type: Schema.Types.ObjectId, ref: "request" }],
  },
  {
    timestamps: true,
  }
);

const Log = mongoose.model("log", LogSchema);
module.exports = Log;
