## Idea central

Dos habilidades de la Tarea 2.2 trabajan juntas:

- **2.2.2** Buscar y correlacionar logs de eventos de seguridad entre aplicaciones y servicios de AWS.
- **2.2.3** **Validar hallazgos** de los servicios de seguridad de AWS para evaluar el **alcance y el impacto** de un evento. *(Contenido nuevo en SCS-C03.)*

Un hallazgo no es un veredicto. Antes de contener hay que responder: ¿es real?, ¿qué recursos y identidades están involucrados?, ¿desde cuándo?, ¿qué datos se vieron afectados?

## Flujo de validación de un hallazgo

1. **Leer el hallazgo:** tipo, severidad, recurso, cuenta, región, tiempos (primera y última observación) y evidencia.
2. **Comprobar si es esperado:** ¿una prueba de penetración autorizada, un escáner de vulnerabilidades, un cambio planificado?
3. **Ampliar el contexto** con otras fuentes:
   - **CloudTrail:** qué llamadas hizo la identidad o el recurso antes y después.
   - **VPC Flow Logs y DNS:** con quién se comunicó.
   - **Detective:** comportamiento histórico y relaciones entre entidades.
   - **Security Hub:** otros hallazgos sobre el mismo recurso (exposiciones, vulnerabilidades).
   - **Inspector y Macie:** vulnerabilidades conocidas y datos sensibles potencialmente expuestos.
4. **Determinar alcance:** otras instancias, usuarios, claves, buckets o regiones afectados.
5. **Determinar impacto:** confidencialidad, integridad, disponibilidad; qué datos o servicios están en riesgo.
6. **Decidir:** falso positivo (suprimir con regla acotada), incidente confirmado (contener y escalar) o necesita más información.

> **En el examen.** La respuesta correcta suele seguir el orden **validar → contener → erradicar → recuperar**. Si la pregunta dice "determinar si la instancia realmente fue comprometida", la respuesta es **investigar** con CloudTrail, flow logs y Detective, no **terminar** la instancia de inmediato.

## Qué aporta cada servicio a la validación

| Servicio | Aporta |
|---|---|
| **GuardDuty** | El hallazgo, severidad (1.0–10.0), recurso, actor, y en *Extended Threat Detection* las **secuencias de ataque** con mapeo a MITRE ATT&CK. |
| **Security Hub** | Vista agregada y priorizada; correlaciona señales de GuardDuty, Inspector, Macie y controles de postura (exposure findings). |
| **Detective** | Línea de tiempo, perfiles de entidad y **finding groups** para ver el alcance y el comportamiento normal. |
| **Inspector** | Si el recurso tenía una vulnerabilidad explotable que explique el compromiso. |
| **Macie** | Si hay datos sensibles en el bucket afectado. |
| **CloudTrail** | Acciones concretas de API (quién, cuándo, desde qué IP, con qué credencial). |
| **Config** | Historial de configuración del recurso: qué cambió y cuándo. |

## Buscar y correlacionar logs entre fuentes

Identificadores comunes para unir eventos:

- **IP de origen** (CloudTrail `sourceIPAddress`, flow logs `srcaddr`, logs de WAF y de ELB).
- **ID de recurso o de instancia**, **ARN de la identidad** y **ID de sesión** (`userIdentity`, `sessionContext`, `accessKeyId`).
- **ID de petición** y **marcas de tiempo** (trabaja en UTC y ten en cuenta que hay retrasos de entrega).
- **Dominio consultado** (logs de DNS) y **nombre de usuario de la aplicación**.

Herramientas según el tamaño y la antigüedad de los datos:

| Necesidad | Herramienta |
|---|---|
| Búsqueda rápida en logs recientes | **CloudWatch Logs Insights** (también entre cuentas) |
| Meses de CloudTrail, flow logs, ELB, WAF | **Athena** sobre S3 |
| Consultas SQL sobre actividad de API | **CloudTrail Lake** (o Athena) |
| Correlación de texto completo y paneles | **OpenSearch Service** |
| Datos normalizados multicuenta | **Security Lake** (OCSF) consultado con Athena |
| Relaciones entre entidades y comportamiento | **Detective** |

Ejemplo de consulta en Logs Insights para ver qué hizo una identidad:

```
fields @timestamp, eventSource, eventName, sourceIPAddress, errorCode
| filter userIdentity.arn like /rol-sospechoso/
| sort @timestamp asc
| limit 200
```

Ejemplo en Athena para ver el uso de una clave de acceso concreta:

```sql
SELECT eventtime, eventsource, eventname, sourceipaddress, awsregion
FROM cloudtrail_logs_pp
WHERE useridentity.accesskeyid = 'AKIAEXAMPLE'
  AND "timestamp" >= '2026/10/20'
ORDER BY eventtime;
```

## Señales típicas de compromiso al correlacionar

- Credenciales de un rol de instancia usadas **desde una IP fuera de AWS**.
- Llamadas de **reconocimiento** (`List*`, `Describe*`, `GetCallerIdentity`) seguidas de acciones de **persistencia** (`CreateUser`, `CreateAccessKey`, `AttachUserPolicy`).
- Acciones en **regiones inusuales** que no usas.
- **Deshabilitar defensas** (`StopLogging`, `DeleteDetector`, cambios en reglas de supresión).
- Picos de **`GetObject`** o `ListBucket` desde una identidad nueva (posible exfiltración).
- **Tráfico saliente** a IPs o dominios de mala reputación, o volumen anómalo.

## Patrones de examen

1. **"Determinar el alcance de una credencial comprometida"** → buscar en CloudTrail por `accessKeyId`/ARN de la sesión en todas las regiones y cuentas.
2. **"Confirmar si un hallazgo de GuardDuty es un falso positivo"** → revisar contexto en Detective y CloudTrail; si es benigno, suprimir con una regla acotada.
3. **"Correlacionar el acceso a S3 con tráfico de red"** → CloudTrail data events de S3 + VPC Flow Logs.
4. **"Consultar logs antiguos de forma económica"** → Athena sobre los logs en S3.
5. **"Identificar otros recursos afectados por el mismo actor"** → finding groups de Detective y búsqueda por IP de origen.

## Referencias

- [Gravedad de hallazgos de GuardDuty](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings-severity.html)
- [Conceptos de Amazon Detective](https://docs.aws.amazon.com/detective/latest/userguide/detective-terms-concepts.html)
- [Athena: tabla de CloudTrail con partition projection](https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table-partition-projection.html)
