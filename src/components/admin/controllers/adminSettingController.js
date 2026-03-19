const Admin = require("../models/admin");
const { generateTokens, success, error } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
// const adminSetting = require("../models/adminSetting");
const adminSetting = require("../models/adminSetting");
const adminSettingController = {
    createProfileSteps:async(req,res) =>{
        try{
            const {defaultBalance,doctorProfileSteps,noOfSteps,doctorRefund,patientRefund,commonHolidays,wokringHours,leaveApplyBefore,maxLeaveApply} = req.body
            console.log(req.body)
            const adminSettings = adminSetting.findOne({})
            if(!adminSettings){
                 return error(res, appString.ADMINSETTING_NOT_FOUND, 401);
            }
        }catch{

        }
    }
}
module.exports = adminSettingController