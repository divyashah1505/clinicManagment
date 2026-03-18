const doctorController = require("../doctors/controllers/doctorController")
const { routeArray } = require("../../middleware")
const express = require("express");

const router = express.Router();

const routes = [
    {
        path: "/register",
        method: "post",
        controller: doctorController.doctorRegister,
        isPublic: true,
    },
    {
        path: "/verify-mail/:token",
        method: "get",
        controller: doctorController.verifyEmail,
        isPublic: true

    },
]
module.exports = routeArray(routes, router, true);
