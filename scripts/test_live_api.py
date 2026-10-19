import urllib.request
import json

def test_api():
    payload = {
        "lot": {
            "lot_id": "LOT-VERIFY-LIVE-01",
            "product_id": "PRODUCT-A",
            "tested_dies": 1000,
            "passing_dies": 890,
            "process_step": "Final Test",
            "equipment_id": "TESTER-02",
            "recipe_revision": "REV-C"
        },
        "comparison_lots": [
            {
                "lot_id": "BASE-01",
                "product_id": "PRODUCT-A",
                "tested_dies": 1000,
                "passing_dies": 970,
                "process_step": "Final Test",
                "equipment_id": "TESTER-02",
                "recipe_revision": "REV-C"
            }
        ]
    }

    req = urllib.request.Request(
        "https://i81d4puvul.execute-api.ap-southeast-2.amazonaws.com/analyze",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req) as resp:
        print("HTTP Status:", resp.status)
        result = json.loads(resp.read().decode("utf-8"))
        print("Analysis status:", result.get("analysis", {}).get("status"))
        print("Observed yield:", result.get("analysis", {}).get("observed_yield_pct"))
        print("Yield drop pp:", result.get("analysis", {}).get("yield_drop_percentage_points"))
        print("AI brief summary:", result.get("ai_investigation", {}).get("summary", "")[:120])
        return result

if __name__ == "__main__":
    test_api()
