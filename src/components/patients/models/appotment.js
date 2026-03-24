const mongoose = require("mongoose");
const { appString } = require("../../utils/appString");
const ENUM = require("../../utils/enum")
const appointmentSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: appString.DOCTOR_MODEL,
        required: true
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: appString.PATIENT_MODEL,
        required: true
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    status: {
        type: Number,
        ENUM: [ENUM.APPOITMENTSTATUS.PENDING, ENUM.APPOITMENTSTATUS.ACCEPT, ENUM.APPOITMENTSTATUS.REJECT],
        default: ENUM.APPOITMENTSTATUS.PENDING
    }
}, { timestamps: true });

module.exports = mongoose.model(appString.APPOITMENT_MODEL, appointmentSchema);

