const doctor = require("../models/doctor");
const { generateTokens, success, error, accessToken, refreshToken } = require("../../utils/commonutills");
const { appString } = require("../../utils/appString");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../../utils/mailSender");

const doctorController = {
    doctorRegister: async (req, res) => {
        try {
            const { username, email, password, countryCode, contactNumber, documents, appointmentsCharges, experienceDetails } = req.body
            console.log(req.body);
            const doctoExist = await doctor.findOne({ email })
            if (doctoExist) {
                return success({ success: false, message: appString.EMAILALREDY_REGISTERED });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const token = crypto.randomBytes(32).toString('hex');
            const doctorData = { username, email, password, countryCode, contactNumber, documents, appointmentsCharges, experienceDetails };
            await client.set(`verify_user:${token}`, JSON.stringify(userData), { EX: 86400 });

            const verifyURL = `http://localhost:3000/api/users/verify-mail/${token}`;
            const html = verificationTemplate(verifyURL);
            await sendEmail(email, 'Verify Your Email', html);


            return success(res, { success: true, message: appString.DOCTOR_RGISTRATION_SUCCESSFULL });
        } catch {
            console.log(error);
            return error(res, { success: false, message: appString.SERVER_ERROR });
        }
    },
    verifyEmail: async (req, res) => {
        try {
            console.log("hit");
            const { token } = req.params;

            const redisData = await client.get(`verify_user:${token}`);
            if (!redisData) {
                return res.render("verificaionExpired");
            }

            const doctorData = JSON.parse(redisData);

            const existingDocor = await doctor.findOne({ email: doctorData.email });
            if (existingDocor) {
                return res.render("alreadyVerified");
            }

            const newDoctor = new doctor(doctorData);
            await newDoctor.save();

            await client.del(`verify_user:${token}`);

            await generateTokens(newDoctor)
            return success(res, appString.DOCTOR_REGISTRATION_SUCCESSFULL_VERIFIED);

            return res.render("verificationSuccess");

        } catch (error) {
            console.error("Verification Error:", error);
            return res.render("verificaionExpired");
        }
    },
}
module.exports = doctorController