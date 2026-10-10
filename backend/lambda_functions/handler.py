import json
import logging
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

from backend.quality_engine.lot import ManufacturingLot
from backend.quality_engine.anomaly_detector import detect_yield_anomaly

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ.get("LOTS_TABLE", "SemiconductorLots")
PREFERENCES_TABLE_NAME = os.environ.get(
    "PREFERENCES_TABLE", "SemiconductorNotificationPreferences"
)
REGION = os.environ.get("AWS_REGION", "ap-southeast-2")
S3_BUCKET = os.environ.get(
    "S3_BUCKET", "semiconductor-traceability-185796530338-ap-southeast-2"
)
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN", "")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)
preferences_table = dynamodb.Table(PREFERENCES_TABLE_NAME)
s3 = boto3.client("s3", region_name=REGION)
sns = boto3.client("sns", region_name=REGION)
bedrock = boto3.client("bedrock-runtime", region_name=REGION)
BEDROCK_MODEL_ID = "amazon.nova-lite-v1:0"


def to_dynamodb(value):
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {key: to_dynamodb(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_dynamodb(item) for item in value]
    return value


def response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload, default=str),
    }


def request_body(event):
    body = event.get("body", event)
    if isinstance(body, str):
        body = json.loads(body)
    if not isinstance(body, dict):
        raise ValueError("Request body must be a JSON object.")
    return body


def jwt_claims(event):
    return (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )


def get_preferences(event):
    claims = jwt_claims(event)
    user_id = claims.get("sub")
    if not user_id:
        return response(401, {"error": "Authenticated user identity is missing."})

    item = preferences_table.get_item(Key={"user_id": user_id}).get("Item")
    if not item:
        return response(200, {
            "email_alerts_enabled": False,
            "subscription_status": "NOT_SUBSCRIBED",
        })

    return response(200, {
        "email_alerts_enabled": bool(item.get("email_alerts_enabled", False)),
        "subscription_status": item.get(
            "subscription_status", "NOT_SUBSCRIBED"
        ),
    })


def update_preferences(event):
    claims = jwt_claims(event)
    user_id = claims.get("sub")
    if not user_id:
        return response(401, {"error": "Authenticated user identity is missing."})

    body = request_body(event)
    enabled = body.get("email_alerts_enabled")
    if type(enabled) is not bool:
        return response(
            400, {"error": "email_alerts_enabled must be true or false."}
        )
    if "user_id" in body:
        return response(
            400, {"error": "Do not supply user_id; identity comes from Cognito."}
        )

    existing = preferences_table.get_item(
        Key={"user_id": user_id}
    ).get("Item", {})

    email = claims.get("email")
    email_verified = str(claims.get("email_verified", "")).lower() == "true"

    if enabled:
        if not email or not email_verified:
            return response(403, {
                "error": "A verified email address is required to enable alerts."
            })
        if not SNS_TOPIC_ARN:
            logger.error("SNS_TOPIC_ARN is not configured.")
            return response(500, {"error": "Notification service is not configured."})

        # Subscribe this verified address. SNS requires the recipient to
        # confirm the subscription before email notifications are delivered.
        result = sns.subscribe(
            TopicArn=SNS_TOPIC_ARN,
            Protocol="email",
            Endpoint=email,
            ReturnSubscriptionArn=True,
        )
        subscription_arn = result.get("SubscriptionArn", "pending confirmation")

        # Resolve the current topic subscription status where possible.
        subscriptions = sns.list_subscriptions_by_topic(
            TopicArn=SNS_TOPIC_ARN
        ).get("Subscriptions", [])
        matching = next(
            (sub for sub in subscriptions if sub.get("Endpoint", "").lower()
             == email.lower()),
            None,
        )
        if matching:
            subscription_arn = matching.get(
                "SubscriptionArn", subscription_arn
            )

        pending = (
            not subscription_arn
            or subscription_arn == "pending confirmation"
        )
        status = "PENDING_CONFIRMATION" if pending else "SUBSCRIBED"

        preferences_table.put_item(Item={
            "user_id": user_id,
            "email": email,
            "email_alerts_enabled": True,
            "subscription_arn": subscription_arn,
            "subscription_status": status,
        })

        return response(200, {
            "email_alerts_enabled": True,
            "subscription_status": status,
            "message": (
                "Check your email and confirm the SNS subscription to receive alerts."
                if pending else
                "Email alerts are enabled."
            ),
        })

    # Disable delivery for this user's subscription when it is confirmed.
    subscription_arn = existing.get("subscription_arn")
    if (
        subscription_arn
        and subscription_arn != "pending confirmation"
        and SNS_TOPIC_ARN
    ):
        sns.unsubscribe(SubscriptionArn=subscription_arn)

    preferences_table.put_item(Item={
        "user_id": user_id,
        "email": existing.get("email", email or ""),
        "email_alerts_enabled": False,
        "subscription_arn": subscription_arn or "",
        "subscription_status": (
            "PENDING_CONFIRMATION"
            if subscription_arn == "pending confirmation"
            else "NOT_SUBSCRIBED"
        ),
    })

    return response(200, {
        "email_alerts_enabled": False,
        "subscription_status": (
            "PENDING_CONFIRMATION"
            if subscription_arn == "pending confirmation"
            else "NOT_SUBSCRIBED"
        ),
        "message": "Email alerts are disabled.",
    })



def generate_ai_investigation(lot, analysis):
    """Generate cautious investigation guidance for an anomalous lot."""
    prompt_data = {
        "lot_id": lot.lot_id,
        "product_id": lot.product_id,
        "process_step": lot.process_step,
        "equipment_id": lot.equipment_id,
        "recipe_revision": lot.recipe_revision,
        "observed_yield_pct": analysis.get("observed_yield_pct"),
        "baseline_yield_pct": analysis.get("baseline_yield_pct"),
        "yield_drop_percentage_points":
            analysis.get("yield_drop_percentage_points"),
        "threshold_percentage_points":
            analysis.get("threshold_percentage_points"),
        "comparison_lot_ids": analysis.get("comparison_lot_ids", []),
    }

    prompt = (
        "You are assisting a semiconductor manufacturing quality engineer. "
        "Review the following synthetic lot-quality data and write a concise "
        "investigation brief. Do not claim to know the root cause. "
        "Do not invent measurements or claim that equipment or a recipe "
        "caused the yield drop. Distinguish observations from hypotheses. "
        "Suggest at most three practical checks, such as calibration, "
        "recipe revision comparison, test conditions, or measurement "
        "integrity. State that engineers must validate the evidence. "
        "Keep the answer under 180 words.\n\n"
        "Lot data (JSON): "
        + json.dumps(prompt_data, separators=(",", ":"))
    )

    result = bedrock.converse(
        modelId=BEDROCK_MODEL_ID,
        messages=[
            {
                "role": "user",
                "content": [{"text": prompt}],
            }
        ],
        inferenceConfig={
            "maxTokens": 300,
            "temperature": 0.2,
        },
    )

    text = "".join(
        item.get("text", "")
        for item in result["output"]["message"]["content"]
        if "text" in item
    ).strip()

    if not text:
        raise ValueError("Bedrock returned an empty investigation brief.")

    return {
        "model_id": BEDROCK_MODEL_ID,
        "summary": text,
        "disclaimer": (
            "AI-generated investigation guidance only. "
            "It does not establish a confirmed root cause."
        ),
    }


def analyze_lot(event, context):
    request_id = getattr(context, "aws_request_id", "local-test")
    logger.info("Analysis request started | request_id=%s", request_id)

    body = request_body(event)
    lot = ManufacturingLot(**body["lot"])
    comparisons = [
        ManufacturingLot(**item) for item in body.get("comparison_lots", [])
    ]

    logger.info(
        "Lot received | lot_id=%s | product_id=%s | "
        "tested_dies=%s | passing_dies=%s | comparison_count=%s",
        lot.lot_id, lot.product_id, lot.tested_dies, lot.passing_dies,
        len(comparisons),
    )

    analysis = detect_yield_anomaly(lot, comparisons)
    logger.info(
        "Analysis completed | lot_id=%s | status=%s | "
        "observed_yield_pct=%s | baseline_yield_pct=%s | "
        "yield_drop_percentage_points=%s",
        lot.lot_id, analysis.get("status"),
        analysis.get("observed_yield_pct"),
        analysis.get("baseline_yield_pct"),
        analysis.get("yield_drop_percentage_points"),
    )

    ai_investigation = None
    if analysis.get("status") == "ALERT":
        try:
            ai_investigation = generate_ai_investigation(lot, analysis)
            logger.info("Bedrock investigation generated | lot_id=%s",
                        lot.lot_id)
        except Exception:
            # AI assistance is optional; preserve the rule-based result.
            logger.exception("Bedrock investigation failed | lot_id=%s",
                             lot.lot_id)

    result = {
        "lot_id": lot.lot_id,
        "product_id": lot.product_id,
        "tested_dies": lot.tested_dies,
        "passing_dies": lot.passing_dies,
        "failed_dies": lot.failed_dies,
        "final_test_yield": lot.final_test_yield,
        "process_step": lot.process_step,
        "equipment_id": lot.equipment_id,
        "recipe_revision": lot.recipe_revision,
        "analysis": analysis,
        "ai_investigation": ai_investigation,
    }

    table.put_item(Item=to_dynamodb(result))
    logger.info("Result saved to DynamoDB | table=%s | lot_id=%s",
                TABLE_NAME, lot.lot_id)

    report_key = f"reports/{lot.lot_id}.json"
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=report_key,
        Body=json.dumps(result, indent=2, default=str).encode("utf-8"),
        ContentType="application/json",
        ServerSideEncryption="AES256",
    )
    logger.info("Report saved to S3 | bucket=%s | key=%s",
                S3_BUCKET, report_key)

    if analysis.get("status") == "ALERT" and SNS_TOPIC_ARN:
        try:
            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=f"Semiconductor yield alert: {lot.lot_id}"[:100],
                Message=json.dumps({
                    "message": "A lot has been flagged for yield investigation.",
                    "lot_id": lot.lot_id,
                    "product_id": lot.product_id,
                    "observed_yield_pct": analysis.get("observed_yield_pct"),
                    "baseline_yield_pct": analysis.get("baseline_yield_pct"),
                    "yield_drop_percentage_points":
                        analysis.get("yield_drop_percentage_points"),
                    "status": analysis.get("status"),
                    "note": (
                        "This is an anomaly flag for investigation, "
                        "not a confirmed root cause."
                    ),
                }, indent=2, default=str),
            )
            logger.info("SNS alert published | lot_id=%s", lot.lot_id)
        except Exception:
            # Keep the successful analysis response available, while logging
            # that the notification itself failed.
            logger.exception("SNS publish failed | lot_id=%s", lot.lot_id)

    return response(200, result)


def lambda_handler(event, context):
    try:
        route_key = event.get("routeKey", "")
        path = event.get("rawPath", "")
        method = event.get("requestContext", {}).get("http", {}).get("method", "")

        if route_key == "GET /preferences" or (method == "GET" and path.endswith("/preferences")):
            return get_preferences(event)

        if route_key == "PUT /preferences" or (method == "PUT" and path.endswith("/preferences")):
            return update_preferences(event)

        if route_key == "POST /analyze" or method == "POST" or not method:
            return analyze_lot(event, context)

        return response(404, {"error": "Route not found."})

    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        logger.warning("Invalid request | error_type=%s | error=%s",
                       type(exc).__name__, str(exc))
        return response(400, {"error": str(exc)})
    except Exception:
        logger.exception("Unexpected handler failure")
        raise
