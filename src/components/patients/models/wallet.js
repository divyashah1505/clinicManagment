const mongoose = require("mongoose")
const { appString } = require("../../utils/appString");
const ENUM = require("../../utils/enum")
const walletSchema = new mongoose.Schema({
       doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: appString.DOCTOR_MODEL,
            // required: true
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: appString.PATIENT_MODEL,
            // required: true
        },
        frozenAmount:{
            type:Number,
            default:0
        },
        totalAmount:{
            type:Number,
            default:0
        },
        status:{
            type:Number,
            ENUM:[ENUM.WALLETSTATUS.ACTIVE,ENUM.WALLETSTATUS.INACTIVE],
            default:ENUM.WALLETSTATUS.INACTIVE
        }
})
module.exports = mongoose.model(appString.WALLET_MODEL, walletSchema);