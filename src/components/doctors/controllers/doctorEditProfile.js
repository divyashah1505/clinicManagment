const doctor = require("../models/doctor");
const { generateTokens, success, error, validateContact, generateOTP } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
const doctorEditProfileController = {
    editProfile:async(req,res) =>{
        try{
            console.log("heloow world")
            const doctorId = req?.user?.id;
            const {steps} = req.body;
            
        }catch{

        }
    }
}
module.exports = doctorEditProfileController