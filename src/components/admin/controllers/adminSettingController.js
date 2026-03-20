const adminSetting = require("../models/adminSetting");
const { success, error } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");

const adminSettingController = {
    createProfileSteps: async (req, res) => {
        console.log("hi")
        try {
            console.log("hit")
            const {  defaultBalance,doctorProfileSteps,doctorRefund,patientRefund,  commonHolidays,workigHours,leaveApplyBefore,maxLeaveApply,} = req.body;
            
            console.log(req.body)

            // if (defaultBalance === undefined || !doctorProfileSteps || !doctorRefund || !patientRefund || !commonHolidays || !workigHours || leaveApplyBefore === undefined || maxLeaveApply === undefined) {
            //     return error(res, {
            //         success: false,
            //         error: appString.REQUIRED_FIELDS,
            //     });

            // }
            console.log("hello")
            let adminSettings = await adminSetting.findOne({});

            if (adminSettings) {
                adminSettings = await adminSetting.findOneAndUpdate(
                    {},
                    {
                        defaultBalance,
                        doctorProfileSteps,
                        doctorRefund,
                        patientRefund,
                        commonHolidays,
                        workigHours,
                        leaveApplyBefore,
                        maxLeaveApply,
                    },
                    { new: true }
                );

                return success(res, {  success: true, message: appString.ADMINSETTING_UPDATED, data: adminSettings, });
            }

            const newSteps = await adminSetting.create({
                defaultBalance,
                doctorProfileSteps,
                doctorRefund,
                patientRefund,
                commonHolidays,
                workigHours,
                leaveApplyBefore,
                maxLeaveApply,
            });

            return success(res, {
                success: true,
                message: appString.STEPSCREATED_SUCCESSFULLY,
                data: newSteps,
            });
        } catch (err) {
            console.error(err);
            return error(res, {
                success: false,
                error: appString.SERVER_ERROR,
            });
        }
    },
};

module.exports = adminSettingController;