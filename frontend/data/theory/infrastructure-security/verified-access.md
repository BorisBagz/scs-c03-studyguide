## Idea central

**AWS Verified Access** da acceso a aplicaciones corporativas **sin VPN**, siguiendo el modelo **Zero Trust**: cada solicitud se evalúa contra la **identidad del usuario** y la **postura del dispositivo** antes de llegar a la aplicación. La tarea 3.3.3 lo menciona para acceso híbrido y la 3.3.5 para limitar acceso innecesario.

> **En el examen.** "Usuarios acceden a una app interna desde navegador, con verificación de identidad y de dispositivo por solicitud, sin VPN" → **Verified Access**. "Túnel de red para usuarios con acceso amplio a una subred" → Client VPN.

## Componentes

| Componente | Qué es |
|---|---|
| **Verified Access instance** | Evalúa cada solicitud y concede acceso solo si se cumplen tus requisitos. |
| **Trust providers** | Servicios que gestionan identidades o estado de seguridad del dispositivo (AWS y terceros). Cada instancia necesita al menos uno; puede tener **un proveedor de identidad** y **varios de dispositivo**. |
| **Trust data** | Datos que envían los proveedores (*user claims* o *trust context*): correo del usuario, versión del SO del dispositivo, etc. |
| **Group** | Colección de endpoints con requisitos de seguridad similares; tiene una **política de grupo** heredada por sus endpoints. |
| **Endpoint** | Representa una aplicación (por ejemplo, detrás de un load balancer). Puede tener además una política propia. |
| **Access policy** | Reglas que **permiten o deniegan** según identidad y postura del dispositivo. |

La página consultada no detalla otros tipos de endpoint (interfaz de red, CIDR, RDS), el lenguaje de políticas (se usa **Cedar** en el servicio, confírmalo en la guía de usuario) ni la asociación con WAF.

## Cómo se evalúa una solicitud

1. El usuario solicita acceso a una aplicación.
2. Verified Access obtiene los **datos de confianza** del usuario desde el proveedor.
3. Los evalúa contra la política del grupo y la del endpoint.
4. Si se permite, reenvía la solicitud a la aplicación por el endpoint.
5. **Todo se deniega por defecto** hasta que se define una política.
6. **Cada intento de acceso se registra**, útil para respuesta a incidentes y auditoría.

## Verified Access frente a otras opciones

| | **Verified Access** | **Client VPN** | **Site-to-Site VPN / Direct Connect** |
|---|---|---|---|
| Modelo | Acceso por **aplicación** y por solicitud | Acceso a **red** | Conexión **sitio a sitio** |
| Verifica dispositivo | Sí (proveedor de dispositivo) | No de forma nativa | No |
| Requiere cliente | Normalmente navegador | Cliente VPN | Dispositivo de red |
| Principio | Zero Trust | Perímetro de red | Perímetro de red |

## Buenas prácticas

- Agrupar aplicaciones con requisitos parecidos y definir la política en el **grupo**.
- Usar **MFA** y atributos de grupo del IdP para decisiones de autorización.
- Enviar los logs a CloudWatch Logs, S3 o Firehose y analizarlos (Security Lake/Athena).
- Una web ACL de WAF puede asociarse a una instancia de Verified Access (aparece en la lista de recursos asociables de la referencia de la API de WAF).

## Patrones de examen

1. **Eliminar la VPN para acceder a apps internas con SSO y estado del dispositivo** → Verified Access.
2. **Denegar acceso desde dispositivos sin cumplimiento** → proveedor de confianza de dispositivo + política.
3. **Auditar cada intento de acceso a la aplicación** → logs de Verified Access.
4. **Aplicaciones con requisitos idénticos** → un grupo con política de grupo.

## Referencias

- [Cómo funciona Verified Access](https://docs.aws.amazon.com/verified-access/latest/ug/how-it-works.html)
- [Proveedores de confianza de Verified Access](https://docs.aws.amazon.com/verified-access/latest/ug/trust-providers.html)
