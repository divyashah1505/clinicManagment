const express = require("express");
const router = express.Router();
const { routeArray } = require("../../middleware")
const patientController = require("../patients/controllers/patientController")
const routes = [
    {
        path: "/registerPatients",
        method: "post",
        controller: patientController.patientRegister,
        isPublic: true,
    },
   
    {
        path: "/patientLogin",
        method: "post",
        controller: patientController.login,
        isPublic: true
    },
    {
        path: "/verifylogin-otp",
        method: "post",
        controller: patientController.verifyOtpLogin,
        isPublic: true
    },
    {
        path:"/bookAppoitments",
        method:"post",
        controller:patientController.bookAppoitments,
    },
    {
        path:"/cancelAppoitment/:appoitmentId",
        method:"put",
        controller:patientController.cancelAppointment
    },
    {
        path:"/rescheduleAppointment/:appoitmentId",
        method:"put",
        controller:patientController.rescheduleAppointment
    }
   
]
module.exports =routes;
