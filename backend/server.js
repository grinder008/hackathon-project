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
  const findingMessages = new Set();

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

    // SSH open to internet
    if (
      content.includes("from_port") &&
      content.includes("22") &&
      content.includes("0.0.0.0/0")
    ) {
      if (!findingMessages.has("ssh")) {
        securityFindings.push({
          severity: "HIGH",
          message: "SSH port 22 exposed to the internet",
        });

        findingMessages.add("ssh");
      }
    }

    // RDP open to internet
    if (
      content.includes("from_port") &&
      content.includes("3389") &&
      content.includes("0.0.0.0/0")
    ) {
      if (!findingMessages.has("rdp")) {
        securityFindings.push({
          severity: "HIGH",
          message: "RDP port 3389 exposed to the internet",
        });

        findingMessages.add("rdp");
      }
    }

    // Public RDS
    if (content.includes("publicly_accessible = true")) {
      if (!findingMessages.has("public-rds")) {
        securityFindings.push({
          severity: "HIGH",
          message: "RDS instance is publicly accessible",
        });

        findingMessages.add("public-rds");
      }
    }

    // Generic internet exposure
    if (content.includes("0.0.0.0/0")) {
      if (!findingMessages.has("open-internet")) {
        securityFindings.push({
          severity: "MEDIUM",
          message: "Internet access detected (0.0.0.0/0)",
        });

        findingMessages.add("open-internet");
      }
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

  const categories = {
  Networking: [
    "aws_vpc",
    "aws_subnet",
    "aws_route_table",
    "aws_route_table_association",
    "aws_internet_gateway",
    "aws_nat_gateway",
  ],

  Security: [
    "aws_security_group",
    "aws_iam_role",
  ],

  Compute: [
    "aws_instance",
    "aws_launch_template",
    "aws_autoscaling_group",
  ],

  Storage: [
    "aws_s3_bucket",
  ],

  Database: [
    "aws_db_instance",
  ],

  LoadBalancing: [
    "aws_lb",
  ],
};

const resourceTypes = {};

resources.forEach((resource) => {
  resourceTypes[resource.type] =
    (resourceTypes[resource.type] || 0) + 1;
});

let summary = "";

Object.entries(categories).forEach(([category, types]) => {
  let categoryContent = "";

  types.forEach((type) => {
    if (resourceTypes[type]) {
      const displayName = friendlyNames[type] || type;

      categoryContent += `- ${resourceTypes[type]} ${displayName}${
        resourceTypes[type] > 1 ? "s" : ""
      }\n`;
    }
  });

  if (categoryContent) {
    summary += `${category}:\n`;
    summary += categoryContent;
    summary += "\n";
  }
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