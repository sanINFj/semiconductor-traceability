import json
import subprocess
import sys

bucket = "waferiq-platform"
region = "ap-southeast-2"

def run_cmd(cmd, desc):
    print(f"--- {desc} ---")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"FAILED: {res.stderr}")
        return False, res.stderr
    print(f"SUCCESS: {res.stdout.strip()}")
    return True, res.stdout.strip()

def main():
    # 1. Create bucket
    ok, err = run_cmd([
        "aws", "s3api", "create-bucket",
        "--bucket", bucket,
        "--region", region,
        "--create-bucket-configuration", f"LocationConstraint={region}"
    ], f"Creating bucket {bucket}")
    
    if not ok:
        if "BucketAlreadyOwnedByYou" in err:
            print("Bucket already owned by you, continuing...")
        else:
            print("Could not create bucket:", err)
            sys.exit(1)

    # 2. Disable Public Access Blocks
    pab_config = {
        "BlockPublicAcls": False,
        "IgnorePublicAcls": False,
        "BlockPublicPolicy": False,
        "RestrictPublicBuckets": False
    }
    with open("/tmp/pab.json", "w") as f:
        json.dump(pab_config, f)

    ok, _ = run_cmd([
        "aws", "s3api", "put-public-access-block",
        "--bucket", bucket,
        "--public-access-block-configuration", "file:///tmp/pab.json",
        "--region", region
    ], "Disabling Public Access Block")
    if not ok:
        sys.exit(1)

    # 3. Configure Website (with SPA ErrorDocument)
    website_config = {
        "IndexDocument": {"Suffix": "index.html"},
        "ErrorDocument": {"Key": "index.html"}
    }
    with open("/tmp/website.json", "w") as f:
        json.dump(website_config, f)

    ok, _ = run_cmd([
        "aws", "s3api", "put-bucket-website",
        "--bucket", bucket,
        "--website-configuration", "file:///tmp/website.json",
        "--region", region
    ], "Setting Website Configuration")
    if not ok:
        sys.exit(1)

    # 4. Attach Public Read Bucket Policy
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{bucket}/*"
            }
        ]
    }
    with open("/tmp/policy.json", "w") as f:
        json.dump(policy, f)

    ok, _ = run_cmd([
        "aws", "s3api", "put-bucket-policy",
        "--bucket", bucket,
        "--policy", "file:///tmp/policy.json",
        "--region", region
    ], "Applying Public Read Policy")
    if not ok:
        sys.exit(1)

    # 5. Sync dist/ to s3://waferiq-platform
    ok, out = run_cmd([
        "aws", "s3", "sync",
        "/home/sanjana066/semiconductor-traceability/frontend-react/dist",
        f"s3://{bucket}",
        "--delete",
        "--region", region
    ], "Syncing production build to S3")
    if not ok:
        sys.exit(1)

    print("\n=======================================================")
    print(f"DEPLOYMENT COMPLETE: http://{bucket}.s3-website-{region}.amazonaws.com")
    print("=======================================================")

if __name__ == "__main__":
    main()
