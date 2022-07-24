const router = require("express").Router();
const {
  sendNoReplyVerificationEmail,
  sendEmailOtp,
} = require("../helpers/mailer");
const {
  verifyToken,
  verifyAdmin,
} = require("../middlewares/tokenVerification");
const Joi = require("joi");
const Resident = require("../schema/Resident");
const bcrypt = require("bcrypt");
const OTP = require("../schema/OtpRecord");
const jwt = require("jsonwebtoken");
const { upload } = require("../helpers/multer");
const { decodeBase64Image } = require("../helpers");
const path = require("path");
const axios = require("axios");
const { sendSMSOtp } = require("../helpers/sms");
const fs = require("fs");
const client = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  {
    lazyLoading: true,
  }
);

router.post("/new/resident", async (req, res) => {
  const {
    firstName,
    lastName,
    mobile,
    email,
    flat,
    building,
    society,
    address,
    password,
    avatar,
  } = req.body;
  const validation = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    mobile: Joi.number().required(),
    flat: Joi.string().required(),
    building: Joi.string().required(),
    society: Joi.string().required(),
    address: Joi.string().required(),
    password: Joi.string().required(),
    avatar: Joi.string(),
  });

  const { error } = validation.validate({
    firstName,
    lastName,
    mobile,
    email,
    flat,
    building,
    society,
    address,
    password,
    avatar,
  });
  if (error) {
    return res.status(200).json({
      status: false,
      error: true,
      message: error.details[0].message,
    });
  }
  try {
    let image = "default.png";
    if (avatar !== null || avatar !== undefined) {
      const base64Data = `data:image/jpeg;base64,${avatar}`;
      const imageBuffer = decodeBase64Image(base64Data);
      const fileName = `${
        Date.now() + firstName.toLowerCase().replace(" ", "")
      }.jpeg`;
      const filePath = path.join(
        __dirname,
        "../",
        "uploads",
        "avatars",
        fileName
      );

      fs.writeFileSync(filePath, imageBuffer.data, (err) => {
        if (err) {
          console.log(err);
        }
      });
      if (req.body.avatar) {
        image = fileName;
      }
    }
    const exists = await Resident.find({ mobile });
    if (exists.length > 0)
      return res.status(200).json({
        error: true,
        status: false,
        message: "Resident is already registered with this mobile.",
      });
    const encryptedPass = await bcrypt.hash(password, 10);

    await Resident.create({
      firstName,
      lastName,
      mobile,
      email,
      flat,
      building,
      society,
      address,
      password: encryptedPass,
      image,
    });
    sendNoReplyVerificationEmail(email);
    res.status(200).json({
      status: true,
      error: false,
      message: "Registration Succesfull",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      status: false,
      error: true,
      message: "Internal Server Error",
    });
  }
});

router.get("/send-otp/:phone", async (req, res) => {
  const { phone } = req.params;
  if (!phone)
    return res.status(200).json({
      status: false,
      error: true,
      message: "No Phone Number Supplied.",
    });
  if (phone.length > 10)
    return res.status(200).json({
      error: true,
      status: false,
      message: "Invalid Phone Number",
    });
  const otp = Math.floor(100000 + Math.random() * 999999);
  try {
    const exists = await OTP.find({ number: phone });
    if (exists.length > 0)
      return res.status(200).json({
        error: true,
        status: false,
        message:
          "An OTP is already generated for this number, Please Wait 2Minutes before requesting new.",
      });
    sendSMSOtp(phone, otp).catch((e) => {
      console.log(e);
    });

    await OTP.create({ number: phone, otp });
    const residentExists = await Resident.find({ mobile: phone });
    if (residentExists.length > 1)
      return res.status(200).json({
        error: true,
        status: false,
        message: "Resident is already registered with this mobile.",
      });
    if (residentExists.length === 1) {
      sendEmailOtp(residentExists[0].email, otp);
    }

    res.status(200).json({
      status: true,
      error: false,
      message: "Otp Sent Succesfullly",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      status: false,
      error: true,
      message: "Internal Server Error",
    });
  }
});

router.get("/verify-otp/:phone/:otp", async (req, res) => {
  const { phone, otp } = req.params;
  const validation = Joi.object({
    phone: Joi.number().required(),
    otp: Joi.number().required(),
  });

  const { error } = validation.validate({
    phone,
    otp,
  });
  if (error)
    return res.status(200).json({
      status: false,
      error: true,
      message: error.details[0].message,
    });

  try {
    const record = await OTP.find({ number: phone });
    if (record.length > 1)
      return res.status(200).json({
        error: true,
        status: false,
        message: `Multiple OTP Records Found For ${phone}. Please Report this to Administrator`,
      });
    if (record.length === 0)
      return res.status(200).json({
        error: true,
        status: false,
        message: `No OTP Records Found For ${phone}. Please Regenerate.`,
      });
    if (record[0].otp !== parseInt(otp))
      return res
        .status(200)
        .json({ error: true, status: false, message: "Invalid OTP Provided." });
    if (record[0].otp === parseInt(otp)) {
      await OTP.deleteOne({ number: phone });
      const residentExists = await Resident.find({ mobile: phone })
        .select("-password")
        .populate("requests");
      if (residentExists.length === 0)
        return res.status(200).json({
          status: true,
          error: false,
          message: "OTP Verified Succesfullly!",
          exists: false,
        });
      if (residentExists.length > 1)
        return res.status(200).json({
          status: false,
          error: true,
          message:
            "Multiple Resident found for this Number, Please Report To Administrator",
        });
      const token = jwt.sign(
        { id: residentExists[0]._id },
        process.env.JWT_SECRET,
        {
          expiresIn: "30d",
        }
      );
      res.status(200).json({
        status: true,
        error: false,
        message: "OTP Verified Succesfullly!",
        exists: true,
        data: residentExists[0],
        token,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      status: false,
      error: true,
      message: "Internal Server Error",
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const validation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  const { error } = validation.validate({
    email,
    password,
  });
  if (error) {
    return res.status(200).json({
      status: false,
      error: true,
      message: error.details[0].message,
    });
  }
  try {
    let resident = await Resident.findOne({ email });
    if (!resident)
      return res.status(200).json({
        status: false,
        error: true,
        message: "Invalid Email or Password",
      });
    const isMatch = await bcrypt.compare(password, resident.password);
    if (!isMatch)
      return res.status(200).json({
        status: false,
        error: true,
        message: "Invalid Email or Password",
      });
    const token = jwt.sign({ id: resident._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    resident = await Resident.findOne({ email }).select("-password");
    res.status(200).json({
      status: true,
      error: false,
      message: "Login Successful",
      data: resident,
      token,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      status: false,
      error: true,
      message: "Internal Server Error",
    });
  }
});

router.post("/new/expo-token", verifyToken, async (req, res) => {
  const { expoToken } = req.body;

  if (!expoToken || !req.user)
    return res.status(200).json({
      error: true,
      status: false,
      message: "No Expo Token Supplied!",
    });
  try {
    const resident = await Resident.findById(req.user._id);
    if (!resident)
      return res.status(200).json({
        error: true,
        status: false,
        message: "No Resident Found!",
      });
    resident.pushToken = expoToken;
    await resident.save();
    res.status(200).json({
      error: false,
      status: true,
      message: "Expo Token Updated Succesfully!",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      error: true,
      status: false,
      message: "Internal Server Error",
    });
  }
});

router.get("/verify/:email", async (req, res) => {
  const { email } = req.params;
  if (!email)
    return res.status(200).json({
      error: true,
      status: false,
      message: "No Email Supplied!",
    });
  try {
    const resident = await Resident.findOne({ email });
    if (!resident)
      return res.status(200).json({
        error: true,
        status: false,
        message: "No Resident Found!",
      });
    if (resident.emailVerified)
      return res.status(200).json({
        error: true,
        status: false,
        message: "Resident Already Verified!",
      });
    resident.emailVerified = true;
    await resident.save();
    res.sendFile(path.resolve(__dirname, "../", "template", "success.html"));
  } catch (e) {
    console.log(e);
    res.status(500).json({
      error: true,
      status: false,
      message: "Internal Server Error",
    });
  }
});

router.get("/reset-otp/:email", async (req, res) => {
  const { email } = req.params;
  if (!email)
    return res.status(200).json({
      error: true,
      status: false,
      message: "No Email Supplied!",
    });
  try {
    const resident = await Resident.findOne({ email });
    if (!resident)
      return res.status(200).json({
        error: true,
        status: false,
        message: "No Resident Found!",
      });
    const otp = Math.floor(100000 + Math.random() * 999999);
    sendEmailOtp(resident.email, otp);
    await Resident.updateOne({ email }, { $set: { otp } });
    res.status(200).json({
      error: false,
      status: true,
      message: "OTP Sent Succesfully!",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      error: true,
      status: false,
      message: "Internal Server Error",
    });
  }
});
router.post("/reset-password", async (req, res) => {
  const { email, password, otp } = req.body;
  const validation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    otp: Joi.number().required(),
  });
  const { error } = validation.validate({
    email,
    password,
    otp,
  });
  if (error) {
    return res.status(200).json({
      status: false,
      error: true,
      message: error.details[0].message,
    });
  }
  try {
    const resident = await Resident.findOne({ email });
    if (!resident)
      return res.status(200).json({
        status: false,
        error: true,
        message: "Invalid Email or Password",
      });
    if (resident.otp !== parseInt(otp))
      return res.status(200).json({
        status: false,
        error: true,
        message: "Invalid OTP!",
      });
    resident.password = await bcrypt.hash(password, 10);
    resident.otp = null;
    await resident.save();

    res.status(200).json({
      status: true,
      error: false,
      message: "Password Updated Succesfully!",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      status: false,
      error: true,
      message: "Internal Server Error",
    });
  }
});

module.exports = router;
