const adminSetting = require("../models/adminSetting");
const { success, error } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");

const adminSettingController = {
    createProfileSteps: async (req, res) => {
        console.log("hi")
        try {
            console.log("hit")
            const {
                defaultBalance,
                doctorProfileSteps,
                doctorRefund,
                patientRefund,
                commonHolidays,
                wokringHours,
                leaveApplyBefore,
                maxLeaveApply,
            } = req.body;

            if (
                defaultBalance === undefined ||
                !doctorProfileSteps ||
                !doctorRefund ||
                !patientRefund ||
                !commonHolidays ||
                !wokringHours ||
                leaveApplyBefore === undefined ||
                maxLeaveApply === undefined
            ) {
                return error(res, {
                    success: false,
                    error: "Please provide all the required fields",
                });
            }

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
                        wokringHours,
                        leaveApplyBefore,
                        maxLeaveApply,
                    },
                    { new: true }
                );

                return success(res, {
                    success: true,
                    message: "Settings updated successfully",
                    data: adminSettings,
                });
            }

            const newSteps = await adminSetting.create({
                defaultBalance,
                doctorProfileSteps,
                doctorRefund,
                patientRefund,
                commonHolidays,
                wokringHours,
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