## Idea central

Detectar no basta: hay que **enrutar** el evento a las personas o sistemas correctos. El patrón básico es:

```
Fuente (GuardDuty, Security Hub, Config, CloudWatch, CloudTrail...)
   → Amazon EventBridge (regla con patrón)
      → Destino: SNS (notificar) · Lambda / SSM Automation / Step Functions (remediar) · otro bus · SIEM
```

## Amazon EventBridge

- Bus de eventos sin servidores. Los servicios de AWS publican eventos en el **bus por defecto** de cada región.
- Una **regla** define un **patrón de evento** (qué eventos coinciden) y uno o más **destinos**.
- Ejemplos de eventos relevantes: hallazgos de **GuardDuty** (`source = aws.guardduty`, `detail-type = GuardDuty Finding`), cambios de cumplimiento de **Config**, hallazgos de **Security Hub**, cambios de estado de **alarmas de CloudWatch**, llamadas a la API registradas por **CloudTrail**.
- **Regional:** una regla actúa sobre los eventos de su región y **los destinos deben estar en la misma región** que la regla. Para centralizar, envía eventos a un **bus de otra cuenta o región** y procesa allí.
- Los destinos pueden requerir un **rol de ejecución** (o una política basada en recursos en el destino).

Patrón de ejemplo para hallazgos de severidad alta o crítica de GuardDuty:

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": { "severity": [{ "numeric": [">=", 7] }] }
}
```

> **En el examen.** Para reaccionar a llamadas a la API (por ejemplo, `StopLogging` en CloudTrail, `DeleteTrail`, cambios a un security group, `ConsoleLogin` de root), una regla de EventBridge sobre los eventos de CloudTrail da respuesta casi en tiempo real. Para *contar* ocurrencias o aplicar umbrales, usa metric filter y alarma.

## Amazon SNS

- Servicio de mensajería **pub/sub**: un tema (*topic*) con **suscriptores** (email, SMS, HTTP/S, Lambda, SQS, Firehose...).
- **Política de acceso del tema:** para que EventBridge publique, la política del tema debe permitir al principal de servicio `events.amazonaws.com` la acción `sns:Publish` sobre el ARN del tema.
- **Cifrado:** si el tema usa cifrado del lado del servidor con KMS, debe ser una **llave administrada por el cliente** cuya política permita a `events.amazonaws.com` usar `kms:Decrypt` y `kms:GenerateDataKey`. Con la llave administrada de AWS (`aws/sns`) no puedes dar ese permiso a los servicios.
- **Datos sensibles:** SNS ofrece **message data protection** para detectar y enmascarar datos sensibles en mensajes (se cubre en el dominio de protección de datos).

### Si EventBridge no entrega a SNS

1. ¿Región del destino distinta a la de la regla?
2. Métricas de la regla: si hay `Invocations` pero también `FailedInvocations`, EventBridge intentó entregar y falló, casi siempre por **permisos**.
3. ¿La **resource policy del tema** permite `events.amazonaws.com` + `sns:Publish`?
4. Si usa rol de ejecución, ¿su trust policy confía en `events.amazonaws.com` y tiene `sns:Publish`?
5. ¿El tema está cifrado con una llave **administrada por el cliente** que permite al servicio de EventBridge?

## AWS User Notifications

Servicio para **centralizar notificaciones** de AWS en un solo lugar. Maneja dos tipos:

| Tipo | Descripción |
|---|---|
| **Managed notifications** | Las que envían por defecto servicios como AWS Health, AWS Marketplace y Billing and Cost Management. |
| **User-configured notifications** | Las creas con **notification configurations** a partir de reglas tuyas (por ejemplo, alarmas de CloudWatch o casos de Support). Usan **EventBridge** por debajo. |

**Canales de entrega:** Notification Center de la consola (por defecto), **correo electrónico**, **Amazon Q Developer en aplicaciones de chat** (Slack, Teams...), notificaciones push en la app móvil de AWS Console y la API de User Notifications. Puedes ver notificaciones de varias cuentas, regiones y servicios con enlaces directos a los recursos.

> **En el examen.** User Notifications es la opción de **menor esfuerzo** para que personas reciban avisos (email o chat) sin construir SNS + Lambda. Si hace falta **automatizar acciones** sobre el entorno, se usa EventBridge con Lambda/SSM/Step Functions.

## Elegir el destino

| Necesidad | Destino |
|---|---|
| Avisar a personas por email/SMS | SNS (o User Notifications) |
| Avisar a un canal de chat | User Notifications con chat, o SNS → Q Developer en aplicaciones de chat |
| Remediar un recurso | Lambda o **SSM Automation** |
| Flujo con varios pasos, aprobaciones o reintentos | **Step Functions** |
| Enviar a un SIEM o sistema de tickets | Firehose / HTTP destination / integración del servicio |
| Centralizar eventos de varias cuentas | Bus de eventos central (regla con destino bus de otra cuenta) |

## Patrones de examen

1. **"Notificar al equipo ante un hallazgo de severidad alta"** → regla de EventBridge con filtro de severidad → SNS.
2. **"La regla funciona pero SNS no envía correos"** → resource policy del tema o llave KMS gestionada por AWS.
3. **"Avisos por chat con el menor esfuerzo"** → User Notifications con canal de chat.
4. **"Remediar automáticamente al detectar `StopLogging`"** → regla EventBridge sobre el evento de CloudTrail → Lambda que reactiva el trail.
5. **"Eventos de todas las regiones en un solo lugar"** → reglas por región que reenvían a un bus central.

## Referencias

- [Procesar hallazgos de GuardDuty con EventBridge](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html)
- [Por qué SNS no recibe notificaciones de EventBridge (AWS re:Post)](https://www.repost.aws/knowledge-center/sns-not-getting-eventbridge-notification)
- [Qué es AWS User Notifications](https://docs.aws.eu/notifications/latest/userguide/what-is-service.html)
