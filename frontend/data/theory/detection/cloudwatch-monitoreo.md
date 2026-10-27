## Idea central

Las habilidades 1.1.1 a 1.1.4 piden **analizar qué hay que monitorear, diseñar la estrategia (incluidos health checks), agregar eventos y crear métricas, alertas y dashboards** para detectar datos o eventos anómalos. **Amazon CloudWatch** es la base: recolecta métricas y logs, evalúa alarmas y dispara acciones.

## Bloques de CloudWatch

| Bloque | Para qué sirve en seguridad |
|---|---|
| **Métricas** | Series de tiempo (CPU, errores 4xx/5xx, llamadas fallidas...). Las de servicios AWS llegan solas; las propias se publican como **métricas personalizadas**. |
| **Metric filters** | Convierten **patrones en logs** en métricas. Es el puente entre *logs* y *alarmas* (por ejemplo, contar inicios de sesión de root o llamadas `AccessDenied` desde CloudTrail). |
| **Alarmas** | Evalúan una métrica o una expresión y ejecutan acciones al cambiar de estado. |
| **Dashboards** | Vistas consolidadas, también entre cuentas y regiones. |
| **Logs Insights** | Consultas interactivas sobre logs (ver el tema de CloudWatch Logs). |
| **Synthetics (canaries)** | Scripts que prueban endpoints y flujos desde fuera, para detectar caídas o cambios inesperados. |

## Alarmas

- **Estados:** `OK`, `ALARM` e `INSUFFICIENT_DATA`. Puedes definir acciones para la transición a cada estado.
- **Acciones disponibles:** notificación a **SNS**, invocación de **Lambda**, acciones de **EC2** (detener, terminar, reiniciar, recuperar; solo alarmas estándar sobre métricas de EC2), acciones de **Auto Scaling**, creación de **OpsItems** en Systems Manager OpsCenter, creación de incidentes en **Incident Manager** y *investigations* de CloudWatch.
- **Cuándo se ejecutan:** casi todas las acciones solo en la **transición** de estado, no repetidamente. Las de Auto Scaling pueden repetirse mientras dure el estado. Los OpsItems e incidentes se crean solo al entrar en `ALARM`.
- **Alarmas compuestas (composite alarms):** combinan otras alarmas con lógica `AND`/`OR`/`NOT` para reducir ruido (alertar solo cuando varias condiciones se cumplen). **No pueden** disparar acciones de Auto Scaling.
- **Detección de anomalías:** una alarma puede compararse contra una **banda de anomalía** aprendida por ML en lugar de un umbral fijo.
- **Mute rules:** suprimen las acciones de alarma durante ventanas programadas (por ejemplo, mantenimiento); CloudWatch sigue enviando eventos de cambio de estado a EventBridge.
- **Datos faltantes:** cada alarma define cómo tratar los puntos de datos ausentes (`missing`, `notBreaching`, `breaching`, `ignore`). Es una causa frecuente de alarmas en `INSUFFICIENT_DATA`.

### Patrón clásico de seguridad: metric filter + alarma

1. CloudTrail entrega eventos a un **log group** de CloudWatch Logs.
2. Un **metric filter** cuenta los eventos que coinciden con un patrón (por ejemplo, `{ $.userIdentity.type = "Root" && $.eventType != "AwsServiceEvent" }` para uso de la cuenta root).
3. Una **alarma** sobre esa métrica notifica por **SNS**.

> **En el examen.** Este flujo (CloudTrail → CloudWatch Logs → metric filter → alarma → SNS) aparece en muchas variantes: uso de root, cambios en security groups, cambios de IAM policy, inicios de sesión de consola sin MFA, llamadas no autorizadas. Para alertas casi en tiempo real *sin* pasar por logs, la alternativa es una **regla de EventBridge** sobre el evento de CloudTrail.

## Health checks y monitoreo de la carga de trabajo (1.1.2)

- **Elastic Load Balancing:** health checks de los targets; las métricas (`UnHealthyHostCount`, `HTTPCode_Target_5XX_Count`) alimentan alarmas.
- **Route 53 health checks:** monitorean endpoints, otras health checks o alarmas de CloudWatch y pueden apoyar el *DNS failover*.
- **CloudWatch Synthetics:** canaries que ejecutan pruebas programadas contra URLs y APIs.
- **Systems Manager:** el estado de nodos administrados y el cumplimiento de State Manager.

## Agregar eventos entre cuentas y regiones (1.1.3)

**CloudWatch cross-account observability** permite monitorear en un solo lugar aplicaciones que abarcan varias cuentas dentro de una región:

- **Monitoring account:** cuenta central que ve los datos.
- **Source account:** cuenta que genera y comparte datos.
- **Sink:** recurso en la cuenta de monitoreo, **uno por región**, que actúa como punto de unión. La cuenta de monitoreo administra el sink.
- **Link:** conexión entre una cuenta origen y la de monitoreo; la cuenta origen administra sus links.
- **Qué se comparte:** métricas, **log groups**, trazas de X-Ray, Application Signals, Application Insights e Internet Monitor.
- **Organizations:** puedes vincular una organización u OU completa (recomendado, para que las cuentas nuevas se incorporen solas) o cuentas individuales.
- **Límites:** una cuenta de monitoreo admite hasta 100 000 cuentas origen; una cuenta origen comparte con hasta 5 cuentas de monitoreo. Los tipos de telemetría deben coincidir en ambos lados o el link falla.
- **Costo:** no hay cargo adicional por compartir logs y métricas entre cuentas.

> **Distinción útil.** Cross-account observability = **ver y consultar** datos centralmente. Para **almacenar** logs de seguridad de forma central e inmutable se usan además destinos como un bucket S3 en una cuenta de logging, suscripciones de CloudWatch Logs hacia un destino central o **Security Lake**.

## Patrones de examen

1. **"Alertar cuando alguien use la cuenta root"** → CloudTrail → CloudWatch Logs → metric filter → alarma → SNS (o regla de EventBridge).
2. **"Reducir falsas alarmas combinando condiciones"** → alarma compuesta.
3. **"Detectar comportamiento atípico sin conocer un umbral"** → alarma con detección de anomalías.
4. **"Crear un ticket automáticamente cuando salte una alarma"** → acción de OpsItem en OpsCenter.
5. **"Monitorear varias cuentas desde una cuenta central"** → cross-account observability (sink + links, idealmente con Organizations).
6. **"La alarma está en INSUFFICIENT_DATA"** → revisa el tratamiento de datos faltantes y si la métrica realmente se está publicando.

## Referencias

- [Acciones de alarma de CloudWatch](https://docs.aws.eu/AmazonCloudWatch/latest/monitoring/alarm-actions.html)
- [Observabilidad entre cuentas de CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html)
- [Monitorear entre cuentas y regiones](https://docs.aws.amazon.com/en_en/AmazonCloudWatch/latest/monitoring/CloudWatch-Cross-Account-Methods.html)
