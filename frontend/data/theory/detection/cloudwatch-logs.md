## Idea central

**Amazon CloudWatch Logs** centraliza, almacena y permite consultar logs de aplicaciones, sistemas y servicios de AWS. Las habilidades 1.2.1, 1.2.2 y 1.2.4 de la guía lo mencionan de forma explícita: **identificar fuentes de logs**, **configurar el agente de CloudWatch Logs**, **crear una cuenta dedicada de logging de CloudWatch** y **analizar con Logs Insights**.

## Estructura

- **Log group:** contenedor de logs con la misma política de retención, permisos y configuración (por ejemplo, un grupo por aplicación o servicio).
- **Log stream:** secuencia de eventos de una misma fuente (una instancia, un contenedor, una función).
- **Retención:** configurable por log group (por defecto, **no expiran**). Define siempre una política acorde con requisitos de cumplimiento y costo.
- **Cifrado:** CloudWatch Logs cifra en reposo; puedes asociar una **llave KMS administrada por el cliente** al log group (la política de la llave debe permitir al servicio de logs usarla).

## Fuentes de logs y cómo llegan

| Fuente | Cómo llega a CloudWatch Logs |
|---|---|
| **EC2 / servidores on-premises** | **CloudWatch Agent** (o el agente unificado); requiere un **rol de instancia** con permisos de logs (por ejemplo, la política `CloudWatchAgentServerPolicy`) y conectividad al endpoint de CloudWatch Logs. |
| **Lambda** | Automático; el **rol de ejecución** necesita permisos `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`. |
| **API Gateway** | Logs de ejecución y de acceso, con un rol de la cuenta para escribir en CloudWatch Logs y una configuración por etapa. |
| **CloudTrail** | Entrega del trail a un log group mediante un rol de IAM. |
| **VPC Flow Logs, Route 53 Resolver, Network Firewall, WAF, EKS...** | Cada servicio ofrece CloudWatch Logs como destino (ver tema de logs de red). |

## Metric filters

Un **metric filter** busca un patrón en los eventos del log group y publica una **métrica personalizada** (se aplica solo a eventos **ingeridos después** de crear el filtro). Se combina con una alarma para alertar por patrones: errores de autenticación, accesos denegados, uso de root, etc.

## Suscripciones: procesar logs en tiempo real

Un **subscription filter** envía en casi tiempo real los eventos que coinciden con un patrón a un destino:

- **Destinos en la misma cuenta:** Kinesis Data Streams, Kinesis Data Firehose o una función Lambda.
- **Destino en otra cuenta:** un **destino lógico** creado con `PutDestination` (Kinesis o Firehose), con una **política de destino** (`PutDestinationPolicy`) que permita a la cuenta emisora enviar logs.
- **Límite:** hasta **dos** subscription filters por log group.
- Para cualquier destino que no sea Lambda, quien configura el filtro necesita `iam:PassRole` sobre el rol que entrega los datos (no hace falta rol en destinos entre cuentas).
- Con Kinesis Data Streams, la distribución por defecto es por *log stream*; `Random` reparte de forma más uniforme.

> **En el examen.** "Enviar los logs de todas las cuentas a una cuenta central de seguridad en tiempo real" → **subscription filter** hacia un **destino lógico** (Kinesis Data Streams o Firehose) en la cuenta de logging, con política que permita a las cuentas origen; de ahí a S3, OpenSearch o un SIEM.

## Cuenta dedicada de logging

Buena práctica de la guía (1.2.2): concentrar los logs en una **cuenta de logging separada**, donde los equipos de aplicaciones no puedan modificarlos ni borrarlos. Dos enfoques que se combinan:

- **Observabilidad entre cuentas** (sink y links): para **ver y consultar** los logs desde una cuenta de monitoreo sin moverlos.
- **Suscripciones a un destino central** o entrega a **S3** en la cuenta de logging: para **almacenar y retener** copias fuera del alcance de la cuenta de origen.

## Logs Insights

Lenguaje de consulta interactivo sobre uno o varios log groups, con comandos como `fields`, `filter`, `stats`, `sort`, `limit`, `parse`:

```
fields @timestamp, userIdentity.arn, eventName, errorCode
| filter errorCode = "AccessDenied"
| stats count(*) as intentos by userIdentity.arn
| sort intentos desc
| limit 20
```

Úsalo para investigación ad hoc; para análisis a escala de meses, Athena sobre S3 suele ser más económico.

## Protección de datos sensibles en logs

Las **data protection policies** detectan datos sensibles con *data identifiers* (ML y patrones). Tienen dos operaciones: **audit** (registra hallazgos y emite la métrica `LogEventsWithFindings` en el espacio de nombres `AWS/Logs`, útil para alarmas) y **de-identify** (**enmascara** los datos al ver los eventos). Solo se permite **una política por log group**: puede contener varias sentencias de *de-identify* y una de *audit*. Este tema se profundiza en el dominio de Protección de datos (habilidad 5.3.4).

## Patrones de examen

1. **"Los logs de la instancia no aparecen en CloudWatch"** → ¿agente instalado y configurado?, ¿rol de instancia con permisos?, ¿salida al endpoint (NAT o VPC endpoint)?
2. **"Enviar logs en tiempo real a otra cuenta"** → subscription filter + destino lógico.
3. **"Alertar cuando aparezca un patrón en un log"** → metric filter + alarma.
4. **"Enmascarar números de tarjeta en logs"** → data protection policy con de-identify.
5. **"Consultar rápidamente los intentos denegados"** → Logs Insights.
6. **"Controlar costo y cumplimiento"** → política de retención por log group y archivo a S3.

## Referencias

- [Subscription filters (PutSubscriptionFilter)](https://docs.aws.eu/AmazonCloudWatchLogs/latest/APIReference/API_PutSubscriptionFilter.html)
- [Observabilidad entre cuentas de CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html)
- [Políticas de protección de datos de CloudWatch Logs](https://docs.aws.eu/AmazonCloudWatch/latest/logs/cloudwatch-logs-data-protection-policies.html)
