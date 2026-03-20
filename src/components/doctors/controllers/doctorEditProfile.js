const doctor = require("../models/doctor");
const { generateTokens, success, error, validateContact, generateOTP } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
const adminSetting = require("../../admin/models/adminSetting");
const adminSetting = require("../../admin/models/adminSetting");
const doctorEditProfileController = {
    editProfile: async (req, res) => {
        try {
            console.log("heloow world")
            const doctorId = req?.user?.id;
            const { defaultBalance, doctorProfileSteps, doctorRefund, patientRefund, commonHolidays, wokringHours, leaveApplyBefore, maxLeaveApply } = req.body;
            console.log(req.body)
            let documents = await doctor.findById({ doctorId });
            if (!documents) {
                return error(res, { message: appString.DOCTORID_NOT_FOUND })
            }
            const AdminSetting = await adminSetting.findOne({})
              if (!AdminSetting) {
                return error(res, { message: appString.ADMINSETTING_NOT_FOUND })
            }
            // const mandatorySteps = await adminSetting.doctorProfileSteps.
        } catch {

        }
    }
}
module.exports = doctorEditProfileController

