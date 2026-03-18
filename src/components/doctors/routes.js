const doctorController = require("../doctors/controllers/doctorController")
module.exports = [
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