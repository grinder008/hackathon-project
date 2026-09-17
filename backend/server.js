const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
});

// Health Check Route
app.get("/", (req, res) => {
  res.send("Terraform AI Reviewer Backend is running!");
});

// Analyze Terraform Files
app.post("/analyze", upload.array("files"), (req, res) => {
  console.log("Request received!");

  const uploadedFiles = req.files || [];

  if (uploadedFiles.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No files uploaded",
    });
  }

  let resources = [];

  uploadedFiles.forEach((file) => {
    const content = file.buffer.toString("utf8");

    console.log(`Processing: ${file.originalname}`);

    const matches = [
      ...content.matchAll(/resource\s+"([^"]+)"\s+"([^"]+)"/g),
    ];

    matches.forEach((match) => {
      resources.push({
        type: match[1],
        name: match[2],
      });
    });
  });

  const summary = `This Terraform project contains ${resources.length} resources.`;

  res.json({
    success: true,
    resourceCount: resources.length,
    resources,
    summary,
  });
});

app.listen(5555, () => {
  console.log("Server running on port 5555");
});