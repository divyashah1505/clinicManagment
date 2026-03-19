const Admin = require("../models/admin");
const { generateTokens, success, error } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
// const adminSetting = require("../models/adminSetting");
const adminSetting = require("../models/adminSetting");
const adminSettingController = {
    createProfileSteps:async(req,res) =>{
        try{
            const {defaultBalance,doctorProfileSteps,doctorRefund,patientRefund,commonHolidays,wokringHours,leaveApplyBefore,maxLeaveApply} = req.body
            console.log(req.body)

              if (!defaultBalance || !doctorProfileSteps || !doctorRefund || !patientRefund || !commonHolidays||wokringHours||!leaveApplyBefore ||!maxLeaveApply) {
                return error(res,{  success: false,error: "Please provide all the required fields "
                });
            }
             const adminSettings = adminSetting.findOne({})
            if(!adminSettings){
                 return error(res, appString.ADMINSETTING_NOT_FOUND, 401);
            }
            const newSteps = await adminSetting.create({defaultBalance,doctorProfileSteps,doctorRefund,patientRefund,commonHolidays,wokringHours,leaveApplyBefore,maxLeaveApply })
             return success(res,{  success: true,  message: appString.stepsCreatedSucessfull,data: newSteps});

        }catch{
            console.log("error")
        }
    }
}
module.exports = adminSettingController