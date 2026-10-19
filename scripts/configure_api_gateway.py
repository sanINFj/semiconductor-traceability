import json
import subprocess
import sys

def main():
    api_id = "i81d4puvul"
    region = "ap-southeast-2"
    
    cors_config = {
        "AllowOrigins": ["*"],
        "AllowMethods": ["GET", "POST", "PUT", "OPTIONS"],
        "AllowHeaders": ["content-type", "authorization"],
        "MaxAge": 300
    }
    
    with open("/tmp/cors.json", "w") as f:
        json.dump(cors_config, f)
        
    print("Updating CORS for API Gateway:", api_id)
    res = subprocess.run([
        "aws", "apigatewayv2", "update-api",
        "--api-id", api_id,
        "--cors-configuration", "file:///tmp/cors.json",
        "--region", region
    ], capture_output=True, text=True)
    
    if res.returncode != 0:
        print("Error updating API CORS:", res.stderr)
        sys.exit(1)
        
    print("API Gateway CORS updated successfully:")
    data = json.loads(res.stdout)
    print("CorsConfiguration:", json.dumps(data.get("CorsConfiguration"), indent=2))

if __name__ == "__main__":
    main()
