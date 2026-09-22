require("dotenv").config({
  path: __dirname + "/.env",
});

console.log(
  "Gemini Key Loaded:",
  !!process.env.GEMINI_API_KEY
);
console.log("Current Directory:", process.cwd());

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
        return;
      }

      resolve(stdout);
    });
  });
}
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
app.post("/analyze", upload.array("files"), async (req, res) => {
  console.log("Request received!");

  const uploadedFiles = req.files || [];
  
  if (uploadedFiles.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No files uploaded",
    });
  }
  const projectDir = path.join(
  __dirname,
  "uploads",
  Date.now().toString()
);

fs.mkdirSync(projectDir, { recursive: true });


  let resources = [];
  let securityFindings = [];
  let terraformCode = "";

  const findingMessages = new Set();

  uploadedFiles.forEach((file) => {
    const filePath = path.join(
  projectDir,
  file.originalname
);

fs.writeFileSync(
  filePath,
  file.buffer
);
    const content = file.buffer.toString("utf8");

    terraformCode += content + "\n\n";

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
  

  console.log("Project Directory:", projectDir);
  console.log("Files in directory:");
  console.log(fs.readdirSync(projectDir));
  let planOutput = "";

try {
  const initOutput = await runCommand(
    '"C:\\Users\\rkaraoud\\OneDrive - Capgemini\\Desktop\\Terraform\\terraform.exe" init',
    projectDir
  );

  console.log("Terraform Init Success:");
  console.log(initOutput);

 planOutput = await runCommand(
    '"C:\\Users\\rkaraoud\\OneDrive - Capgemini\\Desktop\\Terraform\\terraform.exe" plan',
    projectDir
  );

  console.log("Terraform Plan Success:");
  console.log(planOutput);

} catch (error) {
  console.error("Terraform Failed:");
  console.error(error);
}

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

  // OpenAI Analysis

let aiAnalysis = "AI analysis unavailable.";
let terraformScore = "N/A";
let riskLevel = "Unknown";
let productionReadiness = "Unknown";


try {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
  });

const prompt = `
You are an elite AWS Cloud Architect, DevSecOps Engineer, Terraform Expert, and Cloud Security Reviewer.

Your task is to perform a professional infrastructure review of the Terraform configuration provided below.

Your audience consists of:
- DevOps Engineers
- Security Engineers

Analyze the Terraform configuration as if it were being reviewed before deployment into a production AWS environment.

===========================================================
FORMATTING RULES
===========================================================

- Return Markdown only.
- Do NOT use HTML tags.
- Do NOT use Markdown bold (**).
- Do NOT use Markdown italics (*).
- Do NOT return Terraform code examples.
- Do NOT explain Terraform syntax.
- Do NOT repeat information.
- Keep sections concise and easy to scan.
- Use bullet points whenever appropriate.
- Use emojis only for severity levels.

Severity labels:

🔴 CRITICAL
🟠 HIGH
🟡 MEDIUM
🟢 LOW

Use AWS service names naturally:
VPC, EC2, Auto Scaling Group, Security Group, IAM, ALB, RDS, S3, Lambda, Route53, CloudWatch, ECS, ECR, EventBridge, SNS, SQS, DynamoDB.

Focus only on meaningful findings and recommendations.

===========================================================
RETURN EXACTLY THE FOLLOWING SECTIONS
===========================================================

# Executive Summary

Provide a short summary containing:

- Overall architecture quality
- Main strengths
- Main weaknesses
- Production readiness assessment

Maximum 5 sentences.

# Architecture Summary

Describe:

- Networking architecture
- Compute architecture
- Security architecture
- Storage architecture
- Database architecture

List detected components.

List important missing components expected in a production-grade environment.

# Security Findings

Order findings by severity.

For every finding use exactly:

## Finding X

Severity:
<severity>

Issue:
<description>

Risk:
<technical and business impact>

# Reliability Findings

Evaluate:

- High Availability
- Multi-AZ Design
- Fault Tolerance
- Disaster Recovery Readiness

List weaknesses and associated risks.

# Cost Optimization Findings

Identify:

- Overprovisioning risks
- Outdated instance families
- Missing autoscaling opportunities
- Cost optimization opportunities

Only include legitimate observations.

# Recommendations

Provide ONLY the TOP 5 recommendations.

Rank them by impact.

Format:

1. Recommendation
2. Recommendation
3. Recommendation
4. Recommendation
5. Recommendation

Recommendations must be concrete and actionable.

# Terraform Score

Score Categories:

Security: X/25
Reliability: X/25
Scalability: X/25
Best Practices: X/25

Overall Score: XX/100

Provide a short justification.

Scoring Rules:

90-100 = Excellent
75-89 = Good
50-74 = Needs Improvement
0-49 = High Risk

# Production Readiness

Return one value only:

Production Ready
Partially Production Ready
Not Production Ready

Then provide a short explanation.

# Risk Level

Return one value only:

Critical
High
Medium
Low

Then provide a short explanation.

===========================================================
REVIEW PRINCIPLES
===========================================================

Evaluate against:

- AWS Well-Architected Framework
- Security Best Practices
- DevSecOps Principles
- Infrastructure as Code Best Practices
- Enterprise Cloud Standards
- Operational Excellence
- Reliability
- Performance Efficiency
- Cost Optimization

Be strict but fair.

Avoid generic recommendations.

Highlight real risks.

Think like a Principal Cloud Architect performing a production readiness review.

===========================================================
TERRAFORM CONFIGURATION
===========================================================

${terraformCode}
`;


  const result = await model.generateContent(prompt);

  aiAnalysis = result.response
    .text()
    .replace(/<br\s*\/?>/gi, "\n");
  
  const scoreMatch =
    aiAnalysis.match(/Overall Score:\s*(\d+\/100)/i);

if (scoreMatch) {
  terraformScore = scoreMatch[1];

}const riskMatch =
  aiAnalysis.match(
    /# Risk Level\s*([\s\S]*?)(Critical|High|Medium|Low)/i
  );

if (riskMatch) {
  riskLevel = riskMatch[2];
}
const readinessMatch =
  aiAnalysis.match(
    /(Production Ready|Partially Production Ready|Not Production Ready)/i
  );

if (readinessMatch) {
  productionReadiness = readinessMatch[1];
}
console.log("Terraform Score:", terraformScore);
console.log("Risk Level:", riskLevel);
console.log("Production Readiness:", productionReadiness);


} catch (error) {
  console.error("Gemini Error:");
  console.error("Gemini Error Details:");
  console.error(JSON.stringify(error, null, 2));
  console.error(error);
}

res.json({
  success: true,
  resourceCount: resources.length,
  resources,
  resourceBreakdown: resourceTypes,
  summary,
  securityFindings,
  aiAnalysis,
  terraformScore,
  riskLevel,
  productionReadiness,
  terraformPlan: planOutput,
});
});

app.listen(5555, () => {
  console.log("Server running on port 5555");
});