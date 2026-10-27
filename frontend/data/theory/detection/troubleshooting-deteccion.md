## Idea central

La Tarea 1.3 evalúa si sabes **diagnosticar por qué un log no llega, una alerta no salta o un health check falla**. Las habilidades oficiales son:

- **1.3.1** Analizar la **funcionalidad, permisos y configuración** de los recursos (logging de Lambda, logging de API Gateway, health checks, logging de CloudFront).
- **1.3.2** **Corregir** configuraciones erróneas (agente de CloudWatch, logs faltantes).

Método general: sigue el camino del dato **de la fuente al destino** y comprueba en cada salto **permisos, red, configuración y cifrado**.

```
Fuente (recurso) → Agente/servicio de entrega → Permisos (rol / política) → Red (endpoint) → Destino (log group / bucket) → Cifrado (KMS) → Consulta o alarma
```

## Checklist por salto

| Salto | Qué revisar |
|---|---|
| **Fuente** | ¿Está habilitado el logging? ¿Hay tráfico o actividad que registrar? ¿El nivel de log es el correcto? |
| **Entrega** | ¿El agente o servicio de entrega está corriendo con la configuración vigente? |
| **Permisos** | ¿El rol o la política del servicio permite escribir en el destino? ¿La política del destino permite al servicio? |
| **Red** | ¿La instancia o función llega al endpoint (internet, NAT o VPC endpoint)? |
| **Destino** | ¿Existe el log group o bucket, en la **misma región** esperada? ¿Hay cuotas o políticas de retención que lo afectan? |
| **Cifrado** | ¿La llave KMS permite al servicio usarla? |
| **Consulta / alarma** | ¿El filtro, patrón, rango de tiempo o tratamiento de datos faltantes es correcto? |

## CloudWatch Agent no envía logs

Causas habituales y su corrección:

1. **No se aplicó la configuración.** Tras editar el archivo, hay que ejecutar `fetch-config` para que el agente la cargue (con el asistente, el archivo suele quedar en `/opt/aws/amazon-cloudwatch-agent/bin/config.json`). Iniciar el agente sin `fetch-config` conserva la configuración anterior.
2. **Faltan permisos.** La instancia necesita un **rol de instancia** con la política `CloudWatchAgentServerPolicy`.
3. **No hay ruta al endpoint.** Prueba conectividad a `logs.<región>.amazonaws.com:443`. Revisa security group y NACL (puerto 443), salida por **NAT gateway** o internet gateway, o el **VPC endpoint** (su security group debe permitir el origen y resolver a IP de la VPC).
4. **Rutas con comodines.** Si un patrón con comodín coincide con varias carpetas que cambian rápido, el agente solo envía el archivo modificado más recientemente: define cada ruta de forma explícita.
5. **Diagnóstico:** lee el log del agente (Linux: `/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log`; Windows: `C:\ProgramData\Amazon\AmazonCloudWatchAgent\Logs\amazon-cloudwatch-agent.log`). Para más detalle, pon `debug` en `true` en la sección `agent` y repite `fetch-config`.

## AWS Lambda no escribe logs

- El **rol de ejecución** debe permitir `logs:CreateLogGroup`, `logs:CreateLogStream` y `logs:PutLogEvents` (la política administrada `AWSLambdaBasicExecutionRole` los incluye).
- Los logs van a un log group con el nombre `/aws/lambda/<nombre-de-la-función>`, salvo que configures otro destino en los *advanced logging controls*.
- Si el log group usa una **llave KMS** propia, la política de la llave debe permitir a CloudWatch Logs usarla.
- Si **eliminaste el log group**, la función lo vuelve a crear solo si el rol tiene `logs:CreateLogGroup`.
- Revisa también el **nivel de log** configurado y que la función realmente se esté invocando.

## API Gateway no registra

- A nivel de **cuenta y por región** debes configurar el **ARN del rol de CloudWatch** (`cloudWatchRoleArn`): un rol cuya confianza es `apigateway.amazonaws.com` y que tiene la política administrada `AmazonAPIGatewayPushToCloudWatchLogs`. Si falta en una región, no hay logs allí.
- Si falla al fijar el ARN del rol, comprueba que **STS** esté habilitado en esa región.
- Hay **dos tipos independientes** de log: **de ejecución** (cómo se procesó la petición, errores y trazas) y **de acceso** (quién accedió y cómo; tú creas el log group y eliges el formato y las variables `$context`).
- La configuración se activa **por etapa (stage)**.

## CloudFront no entrega logs

Para los **logs estándar (legacy)** a S3:

- La cuenta debe poder modificar la **ACL del bucket**: CloudFront añade `FULL_CONTROL` para la cuenta de entrega de logs (`awslogsdelivery`). Si no puedes actualizarla, crear o actualizar la distribución falla.
- Los buckets nuevos para logs deben tener **ACL habilitadas**. **No uses Object Ownership "bucket owner enforced"**: deshabilita las ACL y CloudFront no podrá entregar.
- Con **SSE-KMS** y llave administrada por el cliente, la política de la llave debe permitir `kms:GenerateDataKey*` (y `kms:Decrypt` si hay S3 Bucket Key) al principal `delivery.logs.amazonaws.com`. La llave administrada `aws/s3` **no funciona**.
- Si S3 restablece los permisos del bucket, CloudFront puede dejar de entregar; desactiva y reactiva el logging o restaura la ACL.
- Los cambios de configuración de logging pueden tardar hasta **12 horas**.
- El logging legacy no admite buckets en **regiones opt-in**; usa el **logging estándar v2**.

## Health checks que fallan

| Servicio | Causas típicas |
|---|---|
| **ELB** | Puerto o ruta del health check incorrectos, código de éxito esperado distinto al que devuelve la aplicación, **security group del target** que no permite el tráfico desde el balanceador, aplicación no escuchando. |
| **Route 53** | Los comprobadores de Route 53 no pueden alcanzar el endpoint: security group o NACL bloquean sus rangos de IP; endpoint privado (los health checks necesitan un endpoint público o una alarma de CloudWatch como proxy). |
| **Auto Scaling** | Reemplazo de instancias por usar el tipo de health check equivocado (EC2 frente a ELB). |

> **En el examen.** Un health check que falla con el servicio sano casi siempre es un **bloqueo de red** (security group/NACL), un **puerto/ruta** equivocado o un **código de respuesta** distinto al esperado.

## VPC Flow Logs y otros logs de red

- No registran ciertos tipos de tráfico (DNS de Amazon, metadatos de instancia, DHCP...); no es un fallo, es una limitación documentada.
- **No se pueden editar**: para cambiar campos o rol, elimina y recrea.
- Sin tráfico activo no hay datos y puede tardar minutos en aparecer.
- Si la entrega a S3 o CloudWatch Logs falla, revisa el **rol de IAM** del flow log y la política del destino.
- **WAF:** el nombre del destino debe empezar por `aws-waf-logs-` y solo se admite **un destino por web ACL**.

## CloudTrail sin eventos o sin entrega

- **Trail detenido** (`StopLogging`) o eliminado: revisa el estado del trail y los eventos de `StopLogging`/`DeleteTrail`.
- **Política del bucket** que no permite a `cloudtrail.amazonaws.com` escribir, o bucket en otra cuenta sin permisos.
- **Política de la llave KMS** que no permite a CloudTrail generar claves de datos.
- **Eventos de datos no aparecen:** no se registran por defecto; habilítalos en el trail.
- **Event history** solo muestra **90 días** de eventos de administración.
- **Entrega a CloudWatch Logs:** el rol de CloudTrail debe poder escribir en el log group.

## Alertas que no se disparan

1. **Alarma** en `INSUFFICIENT_DATA`: revisa el tratamiento de datos faltantes y que la métrica se esté publicando.
2. **Metric filter** sin coincidencias: patrón incorrecto o filtro creado **después** de los eventos (solo aplica a datos nuevos).
3. **Regla de EventBridge** sin coincidencias: patrón incorrecto o región distinta a la del evento.
4. **Notificación que no llega:** la política del tema SNS debe permitir `events.amazonaws.com` + `sns:Publish`; si el tema usa KMS, debe ser una llave administrada por el cliente que permita al servicio. Si hay `FailedInvocations`, es un problema de permisos.
5. **Hallazgos suprimidos:** las reglas de supresión de GuardDuty **no envían** los hallazgos archivados a EventBridge, Security Hub, S3 ni Detective.
6. **Servicio sin habilitar en la región o cuenta:** GuardDuty, Security Hub, Macie y Config son **regionales**; revisa también el estado de la cuenta miembro (`RegionDisabled`).

## Patrones de examen

1. **"Los logs de una instancia no aparecen en CloudWatch"** → configuración aplicada con `fetch-config`, rol con `CloudWatchAgentServerPolicy`, ruta al endpoint.
2. **"API Gateway no escribe logs"** → ARN del rol de CloudWatch a nivel de cuenta en esa región.
3. **"CloudFront dejó de entregar logs a S3"** → ACL del bucket y Object Ownership, política de la llave KMS.
4. **"Lambda no registra"** → permisos de logs del rol de ejecución.
5. **"Una alarma permanece en INSUFFICIENT_DATA"** → métrica no publicada o datos faltantes mal tratados.
6. **"No se reciben hallazgos de GuardDuty en EventBridge"** → regla de supresión, región o patrón de evento.
7. **"El health check falla con la aplicación sana"** → security group/NACL, puerto/ruta o código de éxito.

## Referencias

- [Solucionar problemas de ingesta de CloudWatch Logs (AWS re:Post)](https://repost.aws/knowledge-center/troubleshoot-cloudwatch-log-ingestion)
- [Configurar logging de CloudWatch para API Gateway (REST)](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html)
- [CloudFront: logging estándar (legacy) a S3](https://docs.aws.amazon.com/dk_dk/AmazonCloudFront/latest/DeveloperGuide/standard-logging-legacy-s3.html)
- [Por qué SNS no recibe notificaciones de EventBridge (AWS re:Post)](https://www.repost.aws/knowledge-center/sns-not-getting-eventbridge-notification)
