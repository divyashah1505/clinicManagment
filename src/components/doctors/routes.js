const doctorController = require("../doctors/controllers/doctorController")
const { routeArray } = require("../../middleware")
const express = require("express");
const doctorEditProfileController = require("../doctors/controllers/doctorEditProfile")
const router = express.Router();

const routes = [
    {
        path: "/register",
        method: "post",
        controller: doctorController.doctorRegister,
        isPublic: true,
    },
   
    {
        path:"/doctorLogin",
        method:"post",
        controller:doctorController.login,
        isPublic: true
    },
     {
        path:"/verifylogin-otp",
        method:"post",
        controller:doctorController.verifyOtpLogin,
        isPublic: true
    },{
        path:"/updateDoctorProfile",
        method:"put",
        controller:doctorEditProfileController.editProfile,
    }
]
module.exports = routeArray(routes, router, false,true,false);
