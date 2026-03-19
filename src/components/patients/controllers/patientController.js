const { generateTokens, success, error } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
const Patients = require("../models/patient")

const crypto = require("crypto")
const { sendEmail } = require("../../utils/mailSender");
const { render } = require("ejs");
const patientController = {
        patientRegister: async (req, res) => {
        console.log("hit 1");

        try {
            console.log(req.body);

            const { username, email, password, countryCode, contactNumber } = req.body;
            console.log(req.body);

            // console.log(req.body)
            const patientExist = await Patients.findOne({ email });
            if (patientExist) return error(res, { success: false, message: appString.EMAILALREDY_REGISTERED });

            const phoneValidation = validateContact(countryCode, contactNumber);
            if (!phoneValidation.valid) {
                return error(res, { success: false, message: phoneValidation.message });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const token = crypto.randomBytes(32).toString('hex');

            const patientsData = { username, email, password: hashedPassword, countryCode, contactNumber };

            await client.set(`verify_user:${token}`, JSON.stringify(patientsData), { EX: 86400 });

            const verifyURL = `http://localhost:3000/api/patients/verify-mail/${token}`;
            await sendEmail(email, 'Verify Your Email', verificationTemplate(verifyURL));

            return success(res, { success: true, message: appString.PATIENTS_RGISTRATION_SUCCESSFULL });
        } catch (err) {
            console.error(err);
            return error(res, { success: false, message: appString.SERVER_ERROR });
        }
    },
}
module.exports = patientController;
