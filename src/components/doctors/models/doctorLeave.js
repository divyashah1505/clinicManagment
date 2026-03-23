const mongoose = require("mongoose");
const {appString} = require("../../utils/appString")
const ENUM = require("../../utils/enum.js")
const doctorLeaveSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: true
    },
    fromDate: {
        type: Date,
        required: true
    },
    toDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String
    },
    status: {
        type: Number,
        ENUM: [ENUM.DOCTORLEAVESTATUS.PENDING, ENUM.DOCTORLEAVESTATUS.ACCEPT,ENUM.DOCTORLEAVESTATUS.REJECT],
         default: ENUM.DOCTORLEAVESTATUS.PENDING
    }
})
module.exports = mongoose.model(appString.DOCTOR_LEAVE, doctorLeaveSchema);
