const adminSetting = require("../admin/models/adminSetting");

const recalculateProfileStatus = async (doctorData) => {
    const adminSettings = await adminSetting.findOne({});
    if (!adminSettings) return;

    const stepsObj = adminSettings.doctorProfileSteps || {};
    const allSteps = Object.values(stepsObj).filter(step => step?.key);

    const requiredSteps = allSteps.slice(
        0,
        adminSettings.noOfSteps || allSteps.length
    );

    let completedSteps = [];

    for (let step of requiredSteps) {
        const value = doctorData[step.key];

        if (value !== undefined && value !== null && value !== "") {
            completedSteps.push(step.key);
        }
    }

    const isAllCompleted = requiredSteps.every(step =>
        completedSteps.includes(step.key)
    );

    doctorData.isProfileComplete = isAllCompleted ? 1 : 0;
    await doctorData.save();
};

module.exports = {recalculateProfileStatus};