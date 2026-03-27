const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../../../config/devlopment.json");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const client = require("../utils/redisClient")
const parsePhoneNumberFromString = require("libphonenumber-js");
const { appString } = require("./appString");
const uploadDir = path.join(__dirname, "../../../uploads/IMG");
const Wallet = require("../patients/models/wallet")
const Appointment = require("../patients/models/appotment")
const ENUM = require("../utils/enum")
const cron = require("node-cron")
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error(appString.img_ERR), false);
    },
});

const success = (res, data = {}, message, statusCode = 200) =>
    res.status(statusCode).json({ success: true, message, data });
const error = (res, message, statusCode = 422) =>
    res.status(statusCode).json({ success: false, message });
const storeUserToken = async (userId, accessToken, refreshToken) => {
    await client.set(`auth:accessToken:${userId}`, accessToken, {
        expiresIn: "1d",
    });
    await client.set(`auth:refreshToken:${userId}`, refreshToken, {
        expiresIn: "1d",
    });
};
const removeUserToken = async (userId) => {
    if (!userId) return;
    await client.del(`auth:accessToken:${userId}`);
    await client.del(`auth:refreshToken:${userId}`);
};
const getActiveToken = async (userId) => {
    return await client.get(`auth:accessToken:${userId}`);
};
const generateTokens = async (user) => {
    if (!config.ACCESS_SECRET || !config.REFRESH_SECRET)
        throw new Error(appString.jWTNOT_DEFINED);

    const payload = { id: user._id || user, role: user.role || "user" };

    const accessToken = jwt.sign(payload, config.ACCESS_SECRET, {
        expiresIn: "2h",
    });
    const refreshToken = jwt.sign(payload, config.REFRESH_SECRET, {
        expiresIn: "7d",
    });

    await storeUserToken(payload.id.toString(), accessToken, refreshToken);

    return { accessToken, refreshToken };
};
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
const handleRefreshToken = async (req, res) => {
    try {
        const authHeader = req.headers["authorization"];
        const refreshToken = authHeader?.split(" ")[1];

        if (!refreshToken) {
            return console.error(401).json({ success: false, message: "Token missing" });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_SECRET || config.REFRESH_SECRET,
        );

        const actualId =
            typeof decoded.id === "object" ? decoded.id.id : decoded.id;
        const actualRole =
            typeof decoded.id === "object" ? decoded.id.role : decoded.role;

        const newTokens = await generateTokens({
            id: actualId,
            role: actualRole,
        });

        return console.success(200).json({ success: true, ...newTokens });
    } catch (err) {
        console.error("Refresh Token Error:", err.message);
        return res
            .status(403)
            .json({ success: false, message: "Invalid or expired refresh token" });
    }
};
const validateContact = (countryCode, contactNumber) => {
    try {
        if (!countryCode || !contactNumber) return { valid: false, message: appString.COUNTRY_CODECONTACT_NUMBER_REQUIRED };
        if (!countryCode.startsWith("+")) return { valid: false, message: appString.CODEMUSTSTARTSWITHADDITIONOPERATORS };

        const fullNumber = `${countryCode}${contactNumber}`;
        const parsed = parsePhoneNumberFromString(fullNumber);

        if (!parsed || !parsed.isValid()) {
            return { valid: false, message: appString.INVALID_PHONEFORMAT };
        }

        return { valid: true, fullNumber: parsed.number, country: parsed.country };
    } catch (err) {
        return { valid: false, message: appString.INVALID_PHONEFORMAT };
    }
};

cron.schedule('*/20 * * * *', async () => {
    try {
        console.log('Running appointment auto-reject cron...');
        
        const now = new Date(); 
        const cutoffTime = new Date(now.getTime() - 20 * 60 * 1000);
        
        const pendingAppointments = await Appointment.find({
            status: ENUM.APPOITMENTSTATUS.PENDING, // Ensure this equals 0
            createdAt: { $lte: cutoffTime }
        });

        for (let appoint of pendingAppointments) {
            const refundAmount = Number(appoint.totalAmount); 
            
            if (!isNaN(refundAmount) && refundAmount > 0) { 
                await Wallet.updateOne(
                    { patientId: appoint.patientId },
                    { 
                        $inc: { 
                            totalAmount: refundAmount, 
                            frozenAmount: -refundAmount 
                        } 
                    }
                );
            } else {
                console.warn(`Skipping refund for appointment ${appoint._id}: invalid amount`);
            }

            appoint.status = ENUM.APPOITMENTSTATUS.REJECT;
            await appoint.save();
        }

        console.log(`Auto-rejected ${pendingAppointments.length} appointments`);
    } catch (err) {
        console.error('Cron error:', err);
    }
});



module.exports = { storeUserToken, removeUserToken, getActiveToken, generateTokens, handleRefreshToken, success, error, upload, validateContact, generateOTP }