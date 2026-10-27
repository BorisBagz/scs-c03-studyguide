## Idea central

Además de cifrar, la tarea 5.3 pide **proteger datos sensibles en logs y mensajes**: detectarlos, **enmascararlos** y limitar quién los ve. Servicios clave: **CloudWatch Logs data protection**, **SNS message data protection** y **Macie** (descubrimiento en S3, ver *Detección*).

| Servicio | Qué hace |
|---|---|
| **CloudWatch Logs data protection** | Detecta y **enmascara** datos sensibles en eventos de log al ingerirlos |
| **SNS message data protection** | Audita, desidentifica o **deniega** mensajes con datos sensibles |
| **Amazon Macie** | Descubre datos sensibles en **S3** |
| **Config / Security Hub** | Verifican que los controles estén activos |

> **En el examen.** "Evitar que números de tarjeta aparezcan en los logs, pero permitir que un equipo de seguridad los vea" → **política de protección de datos de CloudWatch Logs** + permiso **`logs:Unmask`** solo para ese equipo.

## CloudWatch Logs data protection

Datos verificados:

- La política **enmascara** los datos sensibles detectados **en el momento de la ingesta** (quedan ocultos en consola, API y consultas).
- Quien tenga **`logs:Unmask`** puede ver los valores sin enmascarar.
- Se aplica a nivel de **cuenta** (todos los grupos de log) o a nivel de **grupo de logs**.
- Usa identificadores de datos **gestionados** (tarjetas, credenciales, datos personales por país) y **personalizados** (regex).
- Límite de análisis: ~**30 720 caracteres** por evento de log.
- Métrica **`LogEventsWithFindings`** para alarmas cuando hay hallazgos.
- Auditoría: destinos de hallazgos hacia CloudWatch Logs, S3 o Firehose.

## SNS message data protection

Datos verificados:

- Políticas con operaciones **Audit** (registra hallazgos), **De-identify** (enmascara/redacta) y **Deny** (bloquea la publicación o entrega).
- Dirección **Inbound** (publicación) y **Outbound** (entrega a suscriptores).
- **Una política por tópico**.
- **Ya no está disponible para clientes nuevos** (según la documentación consultada); no esperes verlo como solución preferente para proyectos nuevos, pero puede aparecer como concepto.

## Otras técnicas para reducir exposición

| Técnica | Cuándo |
|---|---|
| **Tokenización / pseudonimización** | Sustituir el dato por un token y guardar el original en una bóveda |
| **Cifrado de campo (client-side)** | Cifrar campos específicos en la aplicación (p. ej. con AWS Encryption SDK) |
| **CloudFront field-level encryption** | Cifrar campos concretos de un formulario en el borde |
| **Macie + S3** | Descubrir y clasificar antes de decidir controles |
| **Retención mínima** | Ciclo de vida para borrar lo que no se necesita |
| **No poner datos sensibles en etiquetas, nombres o encryption context** | Aparecen en facturación, diagnósticos y CloudTrail |

## Patrones de examen

1. **Logs de aplicación con PII** → política de protección de datos de CloudWatch Logs a nivel de cuenta.
2. **Un grupo de auditoría debe ver el dato original** → permiso `logs:Unmask`.
3. **Evitar que publicadores envíen tarjetas por SNS** → política Deny de message data protection (si está disponible para la cuenta).
4. **Descubrir qué buckets contienen PII** → Macie.
5. **Medir cuántos eventos contienen datos sensibles** → métrica `LogEventsWithFindings` + alarma.

## Referencias

- [Protección de datos sensibles en CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatch-Logs-Data-Protection-Policies.html)
- [Protección de datos de mensajes de Amazon SNS](https://docs.aws.amazon.com/sns/latest/dg/message-data-protection.html)
