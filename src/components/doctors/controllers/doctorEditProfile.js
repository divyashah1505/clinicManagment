const doctor = require("../models/doctor");
const adminSetting = require("../../admin/models/adminSetting");
const { success, error } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");

const doctorEditProfileController = {
    editProfile: async (req, res) => {
        try {
            console.log("editProfile hit");

            const doctorId = req.user.id;

            let doctorData = await doctor.findById(doctorId);
            if (!doctorData) {
                return error(res, { message: appString.DOCTORID_NOT_FOUND });
            }

            const adminSettings = await adminSetting.findOne({});
            if (!adminSettings) {
                return error(res, { message: appString.ADMINSETTING_NOT_FOUND });
            }

            Object.assign(doctorData, req.body);

            const stepsObj = adminSettings.doctorProfileSteps || {};

            const steps = Object.values(stepsObj).filter(step => step?.key);

            const requiredSteps = steps.slice(
                0,
                adminSettings.noOfSteps || steps.length
            );

            let completedSteps = [];

            steps.forEach((step) => {
                const key = step?.key;
                if (!key) return;

                const value = doctorData[key];

                let isValid = false;

                if (value instanceof Map) {
                    isValid = value.size > 0;
                } else if (typeof value === "object" && value !== null) {
                    isValid = Object.keys(value).length > 0;
                } else {
                    isValid =
                        value !== undefined && value !== null && value !== "";
                }

                if (isValid) {
                    completedSteps.push(key);
                }
            });

            doctorData.verifiedCurrentSteps = completedSteps;

            const isAllCompleted = requiredSteps.every((step) =>
                completedSteps.includes(step.key)
            );

            doctorData.isProfileComplete = isAllCompleted ? 1 : 0;

            await doctorData.save();

            return success(res, {
                message: "Profile updated successfully",
                data: doctorData,
            });
        } catch (err) {
            console.error(err);
            return error(res, {
                message:appString.SERVER_ERROR,
            });
        }
    },
};

module.exports = doctorEditProfileController;