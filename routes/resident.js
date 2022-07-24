const router = require("express").Router();
const {
  verifyToken,
  verifyAdmin,
} = require("../middlewares/tokenVerification");
const Resident = require("../schema/Resident");

router.get("/data/residents", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const residents = await Resident.find({});
    res.status(200).json({
      status: true,
      error: false,
      data: residents,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      error: true,
      message: "Internal Server Error",
    });
  }
});

module.exports = router;
