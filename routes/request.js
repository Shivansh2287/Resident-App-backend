const router = require("express").Router();
const Joi = require("joi");
const Request = require("../schema/Request");
const Resident = require("../schema/Resident");
const { sendNewRequestNotification } = require("../helpers/notification");
const { verifyToken } = require("../middlewares/tokenVerification");
const { decodeBase64Image } = require("../helpers/index");
const { getValueRedis } = require("../init_redis");
const path = require("path");
const { sendRequestSMS } = require("../helpers/sms");
const fs = require("fs");
const Log = require("../schema/Log");

router.post("/new/request", verifyToken, async (req, res) => {
  const { firstName, lastName, id, mobile, reqFor, reason, image } = req.body;
  const validation = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    id: Joi.string().required(),
    mobile: Joi.number().required(),
    reqFor: Joi.string().required(),
    reason: Joi.string(),
    image: Joi.string(),
  });
  const { error } = validation.validate({
    firstName,
    lastName,
    mobile,
    id,
    reqFor,
    reason,
    image,
  });
  if (error) {
    return res.status(200).json({
      status: false,
      error: true,
      message: error.details[0].message,
    });
  }
  try {
    const exists = await Request.find({ mobile, status: "pending" });
    if (exists.length > 5)
      return res.status(200).json({
        error: true,
        status: false,
        message:
          "Too Many Active Requests. Please Ask Resident to either Approve or Reject Pending Requests.",
      });
    const residentExists = await Resident.find({ _id: reqFor });
    if (residentExists.length > 1)
      return res.status(200).json({
        error: true,
        status: false,
        message: "Multiple Residents Found , Please Report to Administator.",
      });
    if (residentExists.length === 0)
      return res.status(200).json({
        error: true,
        status: false,
        message: "No Residents Found , Please Select Correct Resident.",
      });
    if (image !== null || image !== undefined) {
      const base64Data = `data:image/jpeg;base64,${image}`;
      const imageBuffer = decodeBase64Image(base64Data);
      const fileName = `${
        Date.now() + firstName.toLowerCase().replace(" ", "")
      }.jpeg`;
      const filePath = path.join(
        __dirname,
        "../",
        "uploads",
        "requests",
        fileName
      );

      fs.writeFileSync(filePath, imageBuffer.data, (err) => {
        if (err) {
          console.log(err);
        }
      });
      const request = await Request.create({
        reqFor,
        firstName,
        lastName,
        mobile,
        id,
        reason,
        image: fileName,
      });
      await sendNewRequestNotification(residentExists[0].pushToken, request);
      const value = await getValueRedis(residentExists[0].pushToken);
      if (value !== null && value !== undefined) {
        req.io.to(value.id).emit("newRequest", request);
      }
      sendRequestSMS(residentExists[0].mobile, request).catch((err) => {
        console.log(err);
      });
      await Resident.updateOne(
        {
          _id: reqFor,
        },
        {
          $push: {
            requests: request._id,
          },
        }
      );
      res.status(200).json({
        status: true,
        error: false,
        message: "Request Created , Resident is Being Notified.",
        request,
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

router.get("/request/status/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const request = await Request.findById(id);
    if (!request)
      return res
        .status(200)
        .json({ error: true, status: false, message: "Request Not Found" });
    res.status(200).json({
      status: true,
      error: false,
      message: "Request Found",
      request,
    });
  } catch (e) {
    res.status(500).json({
      status: false,
      error: true,
      message: "Internal Server Error",
    });
  }
});

router.get("/data/requests", verifyToken, async (req, res) => {
  const { _id } = req.user;
  try {
    const requests = await Resident.findById(_id)
      .populate("requests")
      .select("-password");

    res.status(200).json({
      status: true,
      error: false,
      message: "Requests Fetched Successfully",
      data: requests,
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

router.get("/requests/history", verifyToken, async (req, res) => {
  const { _id } = req.user;

  try {
    const requests = await Request.find({ reqFor: _id }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      status: true,
      error: false,
      message: "Requests Fetched Successfully",
      data: requests,
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

router.get("/requests/pending", verifyToken, async (req, res) => {
  const { _id } = req.user;

  try {
    const requests = await Request.find({
      reqFor: _id,
      status: "pending",
    }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      status: true,
      error: false,
      message: "Requests Fetched Successfully",
      data: requests,
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

router.get("/request/accept/:_id", verifyToken, async (req, res) => {
  const { _id } = req.user;
  const { _id: reqId } = req.params;
  try {
    const request = await Request.findById(reqId);
    if (request.reqFor.toString() !== _id.toString())
      return res.status(200).json({
        error: true,
        status: false,
        message: "You are not Authorized to Accept this Request",
      });
    if (request.status !== "pending")
      return res.status(200).json({
        error: true,
        status: false,
        message: "Request is Already Accepted or Rejected",
      });
    await Request.updateOne(
      {
        _id: reqId,
      },
      {
        $set: {
          status: "accepted",
        },
      }
    );
    const exists = await Log.find({ user: _id });
    if (exists.length === 0) {
      await Log.create({ user: _id, accepted: [request._id], rejected: [] });
    } else {
      await Log.updateOne(
        {
          user: _id,
        },
        {
          $push: {
            accepted: request._id,
          },
        }
      );
    }
    await Resident.updateOne(
      {
        _id: request.reqFor,
      },
      {
        $pull: {
          requests: request._id,
        },
      }
    );
    res.status(200).json({
      status: true,
      error: false,
      message: "Request Accepted Successfully",
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

router.get("/request/reject/:_id", verifyToken, async (req, res) => {
  const { _id } = req.user;
  const { _id: reqId } = req.params;
  try {
    const request = await Request.findById(reqId);
    if (request.reqFor.toString() !== _id.toString())
      return res.status(200).json({
        error: true,
        status: false,
        message: "You are not Authorized to Reject this Request",
      });
    if (request.status !== "pending")
      return res.status(200).json({
        error: true,
        status: false,
        message: "Request is Already Accepted or Rejected",
      });
    await Request.updateOne(
      {
        _id: reqId,
      },
      {
        $set: {
          status: "rejected",
        },
      }
    );
    const exists = await Log.find({ user: _id });
    if (exists.length === 0) {
      await Log.create({ user: _id, accepted: [], rejected: [request._id] });
    } else {
      await Log.updateOne(
        {
          user: _id,
        },
        {
          $push: {
            rejected: request._id,
          },
        }
      );
    }
    await Resident.updateOne(
      {
        _id: request.reqFor,
      },
      {
        $pull: {
          requests: request._id,
        },
      }
    );
    res.status(200).json({
      status: true,
      error: false,
      message: "Request Rejected Successfully",
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

router.get("/data/request/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  if (!id)
    return res
      .status(200)
      .json({ status: false, error: true, message: "No Id Provided" });

  try {
    const request = await Request.findById(id);
    if (request === null || request === undefined)
      return res.status(200).json({
        status: false,
        error: true,
        message: "No Request Found for this ID",
      });
    res.status(200).json({
      status: true,
      error: false,
      message: "Request Fetched Successfully",
      data: request,
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

router.get("/data/stats", verifyToken, async (req, res) => {
  const { _id } = req.user;
  try {
    const residents = await Resident.find({
      _id: { $ne: _id },
    }).count();
    const requests = await Request.find({}).count();
    const totalRequests = await Request.find({ reqFor: _id }).count();
    const acceptedRequests = await Request.find({
      reqFor: _id,
      status: "accepted",
    }).count();
    res.status(200).json({
      status: true,
      error: false,
      message: "Stats Fetched Successfully",
      data: {
        residents,
        requests,
        totalRequests,
        acceptedRequests,
      },
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
