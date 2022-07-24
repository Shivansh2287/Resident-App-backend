const fs = require("fs");
const path = require("path");

const createFolders = () => {
  const uploadsExists = fs.existsSync(path.join(__dirname, "../", "uploads"));
  if (!uploadsExists) {
    fs.mkdirSync(path.join(__dirname, "../", "uploads"));
  }
  const avatarsExists = fs.existsSync(
    path.join(__dirname, "../", "uploads", "avatars")
  );
  if (!avatarsExists) {
    fs.mkdirSync(path.join(__dirname, "../", "uploads", "avatars"));
  }
};
function decodeBase64Image(dataString) {
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    response = {};

  if (matches.length !== 3) {
    return new Error("Invalid input string");
  }

  response.type = matches[1];
  response.data = new Buffer.from(matches[2], "base64");

  return response;
}

module.exports = { createFolders, decodeBase64Image };
