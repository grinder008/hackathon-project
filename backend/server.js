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
  let securityFindings = [];

  uploadedFiles.forEach((file) => {
    const content = file.buffer.toString("utf8");

    console.log(`Processing: ${file.originalname}`);

    // Extract Terraform resources
    const matches = [
      ...content.matchAll(/resource\s+"([^"]+)"\s+"([^"]+)"/g),
    ];

    matches.forEach((match) => {
      resources.push({
        type: match[1],
        name: match[2],
      });
    });

    // Security Check: Detect 0.0.0.0/0
    if (content.includes("0.0.0.0/0")) {
      securityFindings.push({
        severity: "HIGH",
        message:
          "Security Group allows access from anywhere (0.0.0.0/0)",
      });
    }
  });

  // Smart Architecture Summary
  const friendlyNames = {
    aws_vpc: "VPC",
    aws_subnet: "Subnet",
    aws_route_table: "Route Table",
    aws_route_table_association: "Route Table Association",
    aws_internet_gateway: "Internet Gateway",
    aws_security_group: "Security Group",
    aws_launch_template: "Launch Template",
    aws_autoscaling_group: "Auto Scaling Group",
    aws_instance: "EC2 Instance",
    aws_s3_bucket: "S3 Bucket",
    aws_db_instance: "RDS Instance",
    aws_nat_gateway: "NAT Gateway",
    aws_lb: "Load Balancer",
    aws_iam_role: "IAM Role",
  };

  const resourceTypes = {};

  resources.forEach((resource) => {
    resourceTypes[resource.type] =
      (resourceTypes[resource.type] || 0) + 1;
  });

  let summary = "This infrastructure contains:\n\n";

  Object.entries(resourceTypes).forEach(([type, count]) => {
    const displayName = friendlyNames[type] || type;

    summary += `- ${count} ${displayName}${
      count > 1 ? "s" : ""
    }\n`;
  });

  res.json({
    success: true,
    resourceCount: resources.length,
    resources,
    summary,
    securityFindings,
  });
});

app.listen(5555, () => {
  console.log("Server running on port 5555");
});