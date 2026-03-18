const nodemailer = require("nodemailer");
const config = require("../../../config/devlopment.json")
const {appString} = require("../../../src/components/utils/appString")

const sendEmail = async (email,subject,html) =>{
    try{
        const transporter = nodemailer.createTransport({
            host:"smtp.gmail.com",
            port:587,
            secure:false,
            auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
   const mailOptions = {
      from: `"Elaunch Infotech Quiz App" <${config.SMTP_USER}>`,
      to:email,
      subject:subject,
      html:html,
    };
 const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error(appString.SMTPERROR, error);

    throw new Error(appString.SERVICEUNAVAILABLE);
  }
};

module.exports = { sendEmail };
