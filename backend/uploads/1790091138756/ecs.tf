# provider "aws" {
#   region = "eu-north-1"
# }
# #Creating the s3 bucket
# resource "aws_s3_bucket" "bucket" {
#   bucket = "demo-lambda-bucket-object-upload-shit-8820"
# }
# #Enabling the versioning
# resource "aws_s3_bucket_versioning" "versioning" {
#   bucket = aws_s3_bucket.bucket.bucket
#   versioning_configuration {
#     status = "Enabled"
#   }
# }
# #uploading some shit to the s3 bucket
# resource "aws_s3_object" "upload" {
#   bucket = aws_s3_bucket.bucket.bucket
#   key = "punk.html"
#   source = "./punk.html"
# }
# resource "aws_sns_topic" "topic" {
#   name = "sns-topic-demo"
# }
# resource "aws_sns_topic_subscription" "subs" {
#   topic_arn = aws_sns_topic.topic.arn
#   protocol = "email"
#   endpoint = "karaoudriadh@gmail.com"
# }
# #Creating the lambda func
# resource "aws_lambda_function" "func" {
#   function_name    = "demo-lambda-func"
#   role             = aws_iam_role.role.arn
#   runtime          = "python3.12"
#   filename         = "lambda.zip"
#   handler          = "lambda.handler"
#   environment {
#     variables = {
#       SNS_TOPIC_ARN = aws_sns_topic.topic.arn
#     }
#   }
#   source_code_hash = filebase64sha256("lambda.zip")
# }
# #Setting the iam role for lmabda
# resource "aws_iam_role" "role" {
#   name = "demo-lambda-role-my-ninja"
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Principal = {
#           Service = "lambda.amazonaws.com"
#         }
#         Action = "sts:AssumeRole"
#       }
#     ]
#   })
# }
# #Setting the iam policy
# resource "aws_iam_policy" "policy" {
#   name = "demo-iam-policy"
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect   = "Allow"
#         Action   = ["s3:ListBucket"]
#         Resource = aws_s3_bucket.bucket.arn
#       },
#       {
#         Effect   = "Allow"
#         Action   = ["s3:GetObject"]
#         Resource = "${aws_s3_bucket.bucket.arn}/*"
#       },
#       {
#         Effect   = "Allow"
#         Action   = ["sns:Publish"]
#         Resource = aws_sns_topic.topic.arn
#       },
#       {
#         Effect   = "Allow"
#         Action   = ["logs:*"]
#         Resource = "*"
#       }

#     ]
#   })
# }
# #Atatching the policy to role
# resource "aws_iam_role_policy_attachment" "attach" {
#   role       = aws_iam_role.role.name
#   policy_arn = aws_iam_policy.policy.arn
# }
# #Setting the lambda perm
# resource "aws_lambda_permission" "perm" {
#   function_name = aws_lambda_function.func.function_name
#   principal     = "s3.amazonaws.com"
#   action        = "lambda:InvokeFunction"
#   source_arn = aws_s3_bucket.bucket.arn
# }
# #Connecting s3 to lambda
# resource "aws_s3_bucket_notification" "notify" {
#   bucket = aws_s3_bucket.bucket.bucket
#   depends_on = [ aws_lambda_permission.perm ]
#   lambda_function {
#     events        = ["s3:ObjectCreated:*"]
#     filter_suffix = ".html"
#     lambda_function_arn = aws_lambda_function.func.arn
#   }
# }