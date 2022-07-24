const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.route.path.includes("/new/resident")) {
      return cb(null, path.join(__dirname, "../", "uploads", "avatars"));
    }
  },
  filename: function (req, file, cb) {
    cb(
      null,
      "-" +
        Date.now() +
        file.originalname.replace(/\s+/g, "").substring(0, 5) +
        "." +
        file.mimetype.split("/")[1]
    );
  },
});
const upload = multer({ storage: storage });

module.exports = { upload };
