"""
GET /progress

Devuelve todos los items de progreso del usuario (unico, sin auth real):
intentos de quiz y preguntas falladas para repaso espaciado.
"""
import json
import os
from decimal import Decimal

import boto3

TABLE_NAME = os.environ["TABLE_NAME"]
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

USER_PK = "USER#default"


def handler(event, context):
    try:
        items = []
        response = table.query(
            KeyConditionExpression="pk = :pk",
            ExpressionAttributeValues={":pk": USER_PK},
        )
        items.extend(response.get("Items", []))

        while "LastEvaluatedKey" in response:
            response = table.query(
                KeyConditionExpression="pk = :pk",
                ExpressionAttributeValues={":pk": USER_PK},
                ExclusiveStartKey=response["LastEvaluatedKey"],
            )
            items.extend(response.get("Items", []))

        return _response(200, {"items": items})
    except Exception as e:  # noqa: BLE001 - endpoint de uso personal
        return _response(500, {"error": str(e)})


class _DecimalEncoder(json.JSONEncoder):
    """DynamoDB devuelve numeros como Decimal; json no los serializa por defecto."""

    def default(self, o):
        if isinstance(o, Decimal):
            # score/total son siempre enteros en este dominio
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, cls=_DecimalEncoder),
    }
