const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TicketSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: false,
    },
    lastName: {
      type: String,
      required: false,
      unique: false,
    },
    idFacebook: {
      type: String,
      unique: false,
    },
    idCredicoop: {
      type: String,
      unique: false,
    },
    reason: {
      type: String,
      unique: false,
    },
    motivo: {
      type: String,
      unique: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tickets", TicketSchema);
