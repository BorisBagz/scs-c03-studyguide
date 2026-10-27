## Idea central

La habilidad 1.2.6 pide **determinar y configurar las fuentes de log apropiadas según el diseño de red, las amenazas y los ataques**; los ejemplos de la guía son **VPC Flow Logs**, **flow logs de Transit Gateway** y **logs de Route 53 Resolver**. La clave es saber *qué responde cada log* y *qué no registra*.

| Pregunta | Log que la responde |
|---|---|
| ¿Qué tráfico IP permitió o rechazó mi red? | **VPC Flow Logs** |
| ¿Qué tráfico pasó por mi transit gateway? | **Transit Gateway Flow Logs** |
| ¿Qué dominios consultaron mis recursos? | **Route 53 Resolver query logs** |
| ¿Qué peticiones web bloqueó o permitió la regla? | **Logs de AWS WAF** |
| ¿Qué tráfico inspeccionó y alertó el firewall? | Logs de **Network Firewall** (alertas y flujo) |
| ¿Quién llamó a la API de AWS? | CloudTrail (no es un log de red) |

## VPC Flow Logs

Registran metadatos del tráfico IP hacia y desde **interfaces de red** (ENI), subredes o VPC completas. **No capturan el contenido** de los paquetes, solo metadatos (origen, destino, puertos, protocolo, bytes, paquetes, acción `ACCEPT`/`REJECT`...).

- **Destinos:** CloudWatch Logs, Amazon S3 o Amazon Data Firehose.
- **Fuera de la ruta de tráfico:** la captura no afecta el rendimiento ni la latencia.
- **No son en tiempo real:** puede pasar un tiempo hasta que se capturan y publican.
- **Formato:** el predeterminado o uno **personalizado** que elige campos y orden (por ejemplo, `pkt-srcaddr` y `pkt-dstaddr` para ver la dirección original del paquete).
- **No se pueden modificar** después de crearlos (rol de IAM, campos o formato): hay que **eliminar y recrear**.
- Sin tráfico activo no hay datos.

**Tráfico que NO registran:**

- Tráfico de instancias hacia el **servidor DNS de Amazon** (el tráfico hacia un servidor DNS propio sí se registra).
- Activación de licencias de Windows.
- Metadatos de instancia (`169.254.169.254`) y Amazon Time Sync Service (`169.254.169.123`).
- DHCP.
- Tráfico espejado en origen (solo se ve el de destino del *traffic mirroring*).
- Tráfico hacia la IP reservada del router de la VPC por defecto.
- Tráfico entre la interfaz de un endpoint y la de un Network Load Balancer.
- ARP.

> **En el examen.** Si necesitas ver las **consultas DNS** (por ejemplo, detectar *DNS exfiltration* o dominios maliciosos), los VPC Flow Logs **no sirven** porque no registran el tráfico al DNS de Amazon: usa **Route 53 Resolver query logging**. Si ves un `REJECT`, recuerda que lo producen **security groups o network ACLs**; los flow logs no distinguen cuál, pero la dirección y el estado de la conexión ayudan: un NACL sin estado puede rechazar el tráfico de **retorno** de una conexión que el security group sí permitió.

## Transit Gateway Flow Logs

- Registran el tráfico **hacia y desde un transit gateway**, no el de las interfaces de las VPC (para eso, VPC Flow Logs).
- **Destinos:** CloudWatch Logs, S3 o Firehose.
- Incluyen campos propios: `tgw-id`, `tgw-attachment-id`, VPC y subred de origen/destino, y contadores de **paquetes perdidos** por ausencia de ruta, *blackhole*, MTU excedida o TTL expirado (muy útiles para troubleshooting).
- **No capturan:** tráfico *multicast*. Los *Connect attachments* se registran bajo el *transport attachment*.
- Debes ser el **dueño** del transit gateway (o recibir permiso) para crear el flow log.

## Route 53 Resolver query logging

Registra las **consultas DNS** originadas en recursos de tus VPC (instancias, contenedores, funciones Lambda en VPC), incluidas las que resuelve el Resolver.

- Destinos: **CloudWatch Logs**, **S3** o **Firehose**.
- Puedes **compartir** la configuración de logging con otras cuentas mediante **AWS RAM** y asociarla a VPC de varias cuentas para centralizar.
- Casos de uso: detectar consultas a dominios maliciosos o de *command and control*, túneles DNS, descubrir dependencias.
- Se complementa con **Route 53 Resolver DNS Firewall** (bloqueo por listas de dominios) y con los hallazgos de **GuardDuty**, que ya analiza los logs DNS por su cuenta.

## Logs de otros componentes de red y borde

| Componente | Log | Destinos |
|---|---|---|
| **AWS WAF** | Peticiones inspeccionadas y regla aplicada | CloudWatch Logs, S3 o Firehose. El nombre del destino debe empezar por `aws-waf-logs-`. **Un destino por web ACL.** |
| **AWS Network Firewall** | Logs de **alerta**, de **flujo** y de TLS | CloudWatch Logs, S3 o Firehose |
| **Elastic Load Balancing** | Access logs (detalle por petición) | S3 |
| **Amazon CloudFront** | Logs estándar y logs en tiempo real | S3 (estándar) y Kinesis Data Streams (tiempo real) |
| **Amazon S3** | Server access logs (por petición) y **data events de CloudTrail** | S3 / trail |
| **API Gateway** | Logs de ejecución y de acceso | CloudWatch Logs |

### Logs de WAF: detalles que se preguntan

- **Redacción (redacted fields):** puedes **eliminar** de los logs ciertos componentes de la petición: ruta URI, query string, un header concreto o el método HTTP. Útil para no registrar tokens o datos personales.
- **Filtro de logging:** conserva o descarta peticiones según la **acción** de la regla o las **etiquetas (labels)** aplicadas.
- Si el web ACL lo administra **Firewall Manager**, solo Firewall Manager puede modificar o eliminar su configuración de logging.

## Elegir fuentes según la amenaza

| Amenaza o requisito | Fuentes recomendadas |
|---|---|
| Escaneo de puertos, tráfico lateral entre instancias | VPC Flow Logs (+ GuardDuty) |
| Exfiltración por DNS o malware con C2 | Route 53 Resolver query logs + DNS Firewall |
| Ataques web (inyección SQL, bots) | Logs de WAF |
| Conectividad rota entre VPCs o híbrida | Flow logs de TGW (campos `packets-lost-*`) |
| Tráfico malicioso a nivel de red a escala | Network Firewall (alertas) |
| Acceso masivo a objetos de S3 | CloudTrail data events de S3 y logs de acceso de S3 |

## Patrones de examen

1. **"Investigar quién se comunicó con una IP sospechosa"** → VPC Flow Logs (consultados con Athena o Logs Insights).
2. **"Ver las consultas DNS de las instancias"** → Route 53 Resolver query logs (los flow logs no capturan DNS de Amazon).
3. **"Centralizar los query logs de todas las cuentas"** → compartir la configuración con AWS RAM y asociarla a las VPC.
4. **"Registrar peticiones web sin guardar contraseñas en query strings"** → logs de WAF con campos redactados.
5. **"Descubrir por qué un flujo entre VPC por transit gateway se pierde"** → TGW flow logs, campos de paquetes perdidos.
6. **"Cambiar el formato de un flow log existente"** → no se puede; se elimina y se crea uno nuevo.

## Referencias

- [Limitaciones de VPC Flow Logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-limitations.html)
- [Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [Compartir configuraciones de query logging de Resolver](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/query-logging-configurations-managing-sharing.html)
- [Configuración de logging de AWS WAF (CloudFormation)](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-loggingconfiguration.html)
