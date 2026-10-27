## Idea central

En AWS IoT Core cada conexión se **autentica** (¿quién eres?) y se **autoriza** (¿qué puedes hacer?) de forma individual. La seguridad descansa en tres piezas: **una identidad por dispositivo**, **políticas de IoT con mínimo privilegio** y **monitoreo continuo**.

## Autenticación

- Los dispositivos usan normalmente **certificados de cliente X.509** (TLS con autenticación mutua). Las apps web y móviles usan **identidades de Amazon Cognito**.
- Regla de oro: **una identidad por dispositivo**. Compartir un certificado entre muchos dispositivos impide revocar uno sin afectar al resto.
- Asocia los certificados e identidades a un *thing* con `AttachThingPrincipal`.
- **El dispositivo debe validar el servidor:** comprobar que habla con el endpoint de AWS IoT y que su certificado lo emitió una autoridad de confianza. Los certificados de servidor tienen vigencia limitada y AWS empieza a servir los nuevos antes de que venzan los anteriores.
- **Reloj sincronizado:** la validación usa `notBefore`/`notAfter` contra el reloj del dispositivo; usar NTP y esperar la sincronización antes de conectar. No confiar en la hora de fábrica.

## Autorización: políticas de IoT

- Son documentos JSON parecidos a IAM, **adjuntos al certificado** (o a la identidad de Cognito), no al *thing*.
- **Mínimo privilegio:** cada dispositivo conecta con un *client ID* conocido y solo publica/suscribe a un conjunto fijo de temas.
- **Variables de política** permiten una sola política para toda la flota. Ejemplo: `${iot:Connection.Thing.ThingName}` se sustituye al conectar, por lo que el `client ID` debe coincidir con el nombre del *thing* registrado.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "iot:Connect",
    "Resource": ["arn:aws:iot:us-east-1:123456789012:client/${iot:Connection.Thing.ThingName}"]
  }]
}
```

> **En el examen.** "Cada dispositivo solo puede conectarse con su propio ID y publicar en su propio tema, con una única política" → **policy variables** con el nombre del *thing*. Evita `"Resource": "*"` y acciones comodín.

## Conflictos de client ID

- El *client ID* es único por cuenta y región. Una conexión nueva con un ID en uso **desconecta** a la existente.
- Impide con políticas que un dispositivo use el ID de otro.
- Detecta el problema con CloudWatch Logs: `"reason": "DUPLICATE_CLIENT_ID"` (filtro de métrica + alarma).

## Monitoreo y validación

- **AWS IoT Device Defender:** auditoría de configuración (detecta políticas de IoT o IAM demasiado permisivas y varios dispositivos con el mismo *client ID*) y detección de comportamiento anómalo.
- **AWS IoT Device Advisor:** pruebas previas a producción de que el dispositivo conecta bien y sigue las mejores prácticas. Su rol requiere `iam:PassRole` limitado a `iotdeviceadvisor.amazonaws.com`, y la trust policy debe usar `aws:SourceArn` y `aws:SourceAccount` para evitar el **confused deputy**.

## Aprovisionamiento

- **Just-in-time provisioning (JITP):** una plantilla registra el dispositivo automáticamente la primera vez que conecta, en lugar de provisionarlo a mano.
- La página de mejores prácticas consultada no detalla rotación/revocación de certificados ni *fleet provisioning*; ambos temas existen en IoT Core y conviene repasarlos en la guía de desarrollador.

## Patrones de examen

1. **Flota de miles de dispositivos con política común y aislada** → certificado por dispositivo + policy variables.
2. **Un dispositivo comprometido** → desactivar/revocar su certificado (afecta solo a ese dispositivo gracias a la identidad única).
3. **Detectar políticas demasiado permisivas** → IoT Device Defender audit.
4. **Dispositivos que se desconectan mutuamente** → client ID duplicado; política que ate el ID al nombre del *thing*.
5. **App móvil que se conecta por MQTT/WebSocket** → identidad Cognito con política de IoT asociada.

## Referencias

- [Mejores prácticas de seguridad de AWS IoT Core](https://docs.aws.amazon.com/iot/latest/developerguide/security-best-practices.html)
