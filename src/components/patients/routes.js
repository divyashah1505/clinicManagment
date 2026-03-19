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
        path: "/verify-mail/:token",
        method: "get",
        controller: patientController.verifyEmail,
        isPublic: true

    },
     {
            path:"/patientLogin",
            method:"post",
            controller:patientController.login,
            isPublic: true
        },
         {
            path:"/verifylogin-otp",
            method:"post",
            controller:patientController.verifyOtpLogin,
            isPublic: true
        }
]
module.exports = routeArray(routes, router, true);
