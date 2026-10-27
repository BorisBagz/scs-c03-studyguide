"""
POST /progress

Guarda un item de progreso. Tres tipos de registro, segun "type" en el body:

  type = "attempt"
    { "type": "attempt", "domain": "detection", "score": 4, "total": 5,
      "timestamp": "2026-10-26T19:00:00Z" }   # timestamp opcional

  type = "failed_question"
    { "type": "failed_question", "domain": "detection", "questionId": "DET-001" }

  type = "topic"   (tema de teoria estudiado / pendiente)
    { "type": "topic", "topicId": "detection/guardduty", "done": true,
      "updatedAt": "2026-10-26T19:00:00Z" }   # updatedAt opcional
"""
import json
import os
import re
import time

import boto3

TABLE_NAME = os.environ["TABLE_NAME"]
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

USER_PK = "USER#default"
VALID_TYPES = {"attempt", "failed_question", "topic"}
TOPIC_ID_RE = re.compile(r"^[a-z0-9-]{1,60}/[a-z0-9-]{1,80}$")


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "invalid JSON body"})

    record_type = body.get("type")
    if record_type not in VALID_TYPES:
        return _response(400, {"error": f"type must be one of {sorted(VALID_TYPES)}"})

    if record_type == "attempt":
        item = _build_attempt_item(body)
    elif record_type == "topic":
        item = _build_topic_item(body)
    else:
        item = _build_failed_question_item(body)

    if item is None:
        return _response(400, {"error": "missing required fields"})

    try:
        table.put_item(Item=item)
    except Exception as e:  # noqa: BLE001 - endpoint de uso personal
        return _response(500, {"error": str(e)})

    return _response(200, {"ok": True})


def _build_attempt_item(body):
    domain = body.get("domain")
    score = body.get("score")
    total = body.get("total")
    if domain is None or score is None or total is None:
        return None
    timestamp = body.get("timestamp") or _now_iso()
    return {
        "pk": USER_PK,
        "sk": f"ATTEMPT#{timestamp}",
        "recordType": "attempt",
        "domain": domain,
        "score": score,
        "total": total,
        "timestamp": timestamp,
    }


def _build_failed_question_item(body):
    question_id = body.get("questionId")
    domain = body.get("domain")
    if question_id is None or domain is None:
        return None
    return {
        "pk": USER_PK,
        "sk": f"FAILED#{question_id}",
        "recordType": "failed_question",
        "questionId": question_id,
        "domain": domain,
        "lastSeen": _now_iso(),
    }


def _build_topic_item(body):
    topic_id = body.get("topicId")
    done = body.get("done")
    if not isinstance(topic_id, str) or not TOPIC_ID_RE.match(topic_id):
        return None
    if not isinstance(done, bool):
        return None
    return {
        "pk": USER_PK,
        "sk": f"TOPIC#{topic_id}",
        "recordType": "topic",
        "topicId": topic_id,
        "done": done,
        "updatedAt": body.get("updatedAt") or _now_iso(),
    }


def _now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }
