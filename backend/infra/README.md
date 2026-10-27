# Backend — deploy con AWS SAM

Requiere [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) y credenciales AWS configuradas (`aws configure`).

## Deploy (primera vez)

```bash
cd backend/infra
sam build
sam deploy --guided
```

El modo `--guided` pregunta stack name, región, y guarda la config en `samconfig.toml` (gitignored) para deploys futuros con solo `sam deploy`.

## Deploys posteriores

```bash
sam build && sam deploy
```

## Obtener la API key generada

API Gateway genera el valor de la API key automáticamente (no es configurable a un string fijo propio). Para obtenerla tras el deploy:

```bash
aws apigateway get-api-keys --include-values --query "items[?name=='<ApiKeyLogicalId o nombre>'].value" --output text
```

O más simple, desde la consola de AWS: API Gateway → API Keys.

Copiar ese valor y el `ApiBaseUrl` (en los Outputs del deploy) a `frontend/js/config.js` (copiar desde `config.example.js`).

## Costo / free tier

- DynamoDB: `PAY_PER_REQUEST`, sin costo fijo; para este volumen de uso (un solo usuario) el costo es ~$0.
- Lambda: free tier perpetuo de 1M invocaciones/mes.
- API Gateway (REST API): free tier de 1M llamadas/mes durante los primeros 12 meses de la cuenta AWS; después, ~$3.50 por millón de llamadas — para uso personal esto es centavos al mes.

## Eliminar el stack

```bash
sam delete
```
