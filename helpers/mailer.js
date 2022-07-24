const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
let transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false, // use TLS
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});
const handlebarOptions = {
  viewEngine: {
    partialsDir: path.resolve(__dirname, "../", "template/"),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, "../", "template/"),
};

transporter.use("compile", hbs(handlebarOptions));

const sendNoReplyVerificationEmail = async (email) => {
  var mailOptions = {
    from: `"NEURALSIFT" <${process.env.EMAIL}>`,
    to: email,
    subject: "Neuralsift's Resident App Email Verification.",
    template: "verify",
    context: {
      email: email,
    },
    attachments: [
      {
        filename: "logo.png",
        path: path.resolve(__dirname, "../", "assets/images/logo.png"),
        cid: "logo",
      },
    ],
  };

  // trigger the sending of the E-mail
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      return console.log(error);
    }
  });
};

const sendEmailOtp = (email, otp) => {
  var mailOptions = {
    from: `"NEURALSIFT" <${process.env.EMAIL}>`, // sender address
    to: email, // list of receivers
    subject: "Neuralsift's Resident App Verification OTP.", // Subject line
    template: "abc", // the name of the template file i.e email.handlebars
    context: {
      otp: otp,
    },
    attachments: [
      {
        filename: "logo.png",
        path: path.resolve(__dirname, "../", "assets/images/logo.png"),
        cid: "logo",
      },
    ],
  };

  // trigger the sending of the E-mail
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      return console.log(error);
    }
  });
};

const sendRequestEmail = (email, otp) => {
  var mailOptions = {
    from: `"NEURALSIFT" <${process.env.EMAIL}>`, // sender address
    to: email, // list of receivers
    subject: "Neuralsift's Resident App Verification OTP.", // Subject line
    template: "abc", // the name of the template file i.e email.handlebars
    context: {
      name: po.supplier.supplierName,
      company: settingsData.companyData.name,
    },
    attachments: [
      {
        filename: "logo.png",
        path: path.resolve(__dirname, "../", "assets/images/logo.png"),
        cid: "logo",
      },
    ],
  };

  // trigger the sending of the E-mail
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      return console.log(error);
    }
  });
};
module.exports = {
  sendNoReplyVerificationEmail,
  sendEmailOtp,
  sendRequestEmail,
};
