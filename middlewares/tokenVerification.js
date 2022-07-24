const jwt = require("jsonwebtoken");
const Resident = require("../schema/Resident");
// Middleware to check if the user is logged in
function verifyToken(req, res, next) {
  const bearerToken = req.headers.authorization;

  if (bearerToken) {
    const token = bearerToken.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        res.status(200).json({
          status: false,
          error: true,
          message: "Unauthorized",
        });
      } else {
        req.user = await Resident.findById(decoded.id)
          .select("-password")
          .populate("requests");
        if (req.user === null || req.user === undefined) {
          res.status(200).json({
            status: false,
            error: true,
            message: "No authorization header was provided.",
          });
        }
        next();
      }
    });
  } else {
    res.status(200).json({
      status: false,
      error: true,
      message: "Unauthorized",
    });
  }
}

function verifyAdmin(req, res, next) {
  const user = req.user;
  if (user._isAdmin === true) {
    next();
  } else {
    return res.status(403).json({
      error: true,
      status: false,
      message: "Not Authorized as Administrator.",
    });
  }
}

module.exports = { verifyToken, verifyAdmin };
