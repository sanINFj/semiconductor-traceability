import json
import subprocess
import sys

def main():
    print("--- 1. Setting S3 Website Configuration ---")
    website_config = {
        "IndexDocument": {"Suffix": "index.html"},
        "ErrorDocument": {"Key": "index.html"}
    }
    with open("/tmp/website.json", "w") as f:
        json.dump(website_config, f, indent=2)

    res1 = subprocess.run([
        "aws", "s3api", "put-bucket-website",
        "--bucket", "aws-websitesc-neww",
        "--website-configuration", "file:///tmp/website.json",
        "--region", "ap-southeast-2"
    ], capture_output=True, text=True)
    if res1.returncode != 0:
        print("Error setting website config:", res1.stderr)
        sys.exit(1)
    print("Website configuration updated with SPA error routing.")

    print("--- 2. Setting S3 Bucket Public Read Policy ---")
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::aws-websitesc-neww/*"
            }
        ]
    }
    with open("/tmp/policy.json", "w") as f:
        json.dump(policy, f, indent=2)

    res2 = subprocess.run([
        "aws", "s3api", "put-bucket-policy",
        "--bucket", "aws-websitesc-neww",
        "--policy", "file:///tmp/policy.json",
        "--region", "ap-southeast-2"
    ], capture_output=True, text=True)
    if res2.returncode != 0:
        print("Error setting bucket policy:", res2.stderr)
        sys.exit(1)
    print("Bucket policy applied successfully (PublicReadGetObject).")

    print("--- 3. Syncing dist/ directory to s3://aws-websitesc-neww ---")
    res3 = subprocess.run([
        "aws", "s3", "sync",
        "/home/sanjana066/semiconductor-traceability/frontend-react/dist",
        "s3://aws-websitesc-neww",
        "--delete",
        "--region", "ap-southeast-2"
    ], capture_output=True, text=True)
    if res3.returncode != 0:
        print("Error syncing to S3:", res3.stderr)
        sys.exit(1)
    print(res3.stdout)
    print("Sync complete.")

if __name__ == "__main__":
    main()
