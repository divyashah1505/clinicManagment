const mongoose = require("mongoose")
const {appString} = require("../../utils/appString")
const appoitmentSchema = new mongoose.Schema({
    doctorId:{
          type:mongoose.Schema.Types.ObjectId,
        ref:appString.DOCTOR_MODEL,
        required:true
    },
    patientId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:appString.PATIENT_MODEL,
        required:true
    },
    time:{
        type:map
    }

})