import json
import subprocess
import sys
import time

def main():
    print("--- 1. Checking if CloudFront distribution already exists ---")
    res_list = subprocess.run([
        "aws", "cloudfront", "list-distributions"
    ], capture_output=True, text=True)
    
    if res_list.returncode == 0 and res_list.stdout.strip():
        data = json.loads(res_list.stdout)
        items = data.get("DistributionList", {}).get("Items", [])
        for dist in items:
            for orig in dist.get("Origins", {}).get("Items", []):
                if "waferiq-platform" in orig.get("DomainName", ""):
                    print(f"Existing distribution found: https://{dist['DomainName']} (ID: {dist['Id']})")
                    return dist['DomainName']

    print("--- 2. Creating CloudFront Distribution for waferiq-platform ---")
    caller_ref = f"waferiq-{int(time.time())}"
    
    dist_config = {
        "CallerReference": caller_ref,
        "Comment": "WaferIQ Semiconductor Intelligence Platform",
        "Enabled": True,
        "Origins": {
            "Quantity": 1,
            "Items": [
                {
                    "Id": "S3-waferiq-platform-website",
                    "DomainName": "waferiq-platform.s3-website-ap-southeast-2.amazonaws.com",
                    "CustomOriginConfig": {
                        "HTTPPort": 80,
                        "HTTPSPort": 443,
                        "OriginProtocolPolicy": "http-only"
                    }
                }
            ]
        },
        "DefaultCacheBehavior": {
            "TargetOriginId": "S3-waferiq-platform-website",
            "ViewerProtocolPolicy": "redirect-to-https",
            "AllowedMethods": {
                "Quantity": 3,
                "Items": ["GET", "HEAD", "OPTIONS"],
                "CachedMethods": {
                    "Quantity": 2,
                    "Items": ["GET", "HEAD"]
                }
            },
            "ForwardedValues": {
                "QueryString": False,
                "Cookies": {"Forward": "none"}
            },
            "MinTTL": 0,
            "DefaultTTL": 300,
            "MaxTTL": 3600
        },
        "CustomErrorResponses": {
            "Quantity": 1,
            "Items": [
                {
                    "ErrorCode": 404,
                    "ResponsePagePath": "/index.html",
                    "ResponseCode": "200",
                    "ErrorCachingMinTTL": 10
                }
            ]
        }
    }

    with open("/tmp/cf_config.json", "w") as f:
        json.dump(dist_config, f, indent=2)

    res_create = subprocess.run([
        "aws", "cloudfront", "create-distribution",
        "--distribution-config", "file:///tmp/cf_config.json"
    ], capture_output=True, text=True)

    if res_create.returncode != 0:
        print("Error creating CloudFront distribution:", res_create.stderr)
        sys.exit(1)

    result = json.loads(res_create.stdout)
    cf_domain = result.get("Distribution", {}).get("DomainName")
    cf_id = result.get("Distribution", {}).get("Id")
    print(f"SUCCESS: Created CloudFront Distribution {cf_id}")
    print(f"HTTPS URL: https://{cf_domain}")
    return cf_domain

if __name__ == "__main__":
    main()
