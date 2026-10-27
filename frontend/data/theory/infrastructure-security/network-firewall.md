## Idea central

**AWS Network Firewall** es un firewall de red administrado y un servicio de **prevención de intrusiones (IPS)** para tu VPC. Inspecciona tráfico de capa 3 a 7 en el borde de subredes de inspección. A diferencia de SG/NACL, soporta **filtrado por dominio**, **reglas con formato Suricata** (compatible), inspección de **TLS** y registro detallado. Se complementa con **Route 53 Resolver DNS Firewall**, que filtra consultas **DNS**.

> **En el examen.** "Filtrar tráfico saliente por **nombre de dominio**" → Network Firewall (domain list) o DNS Firewall (si es a nivel DNS). "IPS/inspección profunda de paquetes en la VPC" → Network Firewall. "Un solo punto de inspección para muchas VPC" → Network Firewall en una VPC de inspección + Transit Gateway.

## Componentes

| Componente | Qué es |
|---|---|
| **Firewall** | Se despliega en **subredes de firewall** dedicadas (un endpoint por AZ). El tráfico se enruta hacia el endpoint con tablas de rutas. |
| **Firewall policy** | Define el comportamiento: grupos de reglas stateless y stateful, acciones por defecto, orden de reglas, TLS. Una política puede compartirse entre firewalls. |
| **Rule groups** | **Stateless** (por paquete, sin contexto de conexión) y **stateful** (por flujo, con contexto). |
| **Logging** | Registros de **alertas** y de **flujo** hacia S3, CloudWatch Logs o Firehose. |

### Motor stateless

Evalúa cada paquete de forma aislada, rápido. Acciones: **`aws:pass`**, **`aws:drop`**, **`aws:forward_to_sfe`** (enviar al motor stateful). Las acciones por defecto stateless son obligatorias; los fragmentos UDP se manejan por separado (otros protocolos fragmentados se descartan en silencio).

### Motor stateful

Mantiene el contexto de conexión. Tipos de reglas:

- **Reglas 5-tuple** (protocolo, origen, destino, puertos).
- **Lista de dominios:** permite o deniega por nombre de dominio. Para **HTTP** lee el encabezado `Host`; para **HTTPS** lee el **SNI** del handshake TLS; **no hace consultas DNS**. Un `.` inicial (por ejemplo `.example.com`) incluye subdominios. Acciones: `Allow` (deniega lo que **no** coincide con la lista), `Deny`, `Reject` (TCP reset, solo TCP) y `Alert`.
- **Reglas compatibles con Suricata** (firmas IPS).
- **Grupos de reglas administrados** (AWS y Marketplace).

**Orden de evaluación stateful** (`StatefulEngineOptions`):

| Modo | Comportamiento |
|---|---|
| `DEFAULT_ACTION_ORDER` | Se evalúan por tipo de acción (pass, drop, alert...). No admite acciones por defecto stateful. |
| **`STRICT_ORDER`** | Se evalúan **en el orden definido** y permite **acciones por defecto** como `aws:drop_strict` (modelo "denegar todo salvo lo permitido"). |

> **Ojo.** Con el orden por defecto, no combines grupos de dominios `Allow` con otros `Reject`/`Alert`: la regla de descarte implícita del grupo `Allow` se aplica antes. Para un diseño "default deny" explícito, usa `STRICT_ORDER`.

### `HOME_NET`

El filtrado de dominios aplica por defecto solo al tráfico del CIDR de la VPC donde está el firewall. Para inspeccionar tráfico de **otras VPC** (por ejemplo, vía Transit Gateway), define `HOME_NET` con todos los CIDR a inspeccionar (incluido el de la VPC del firewall). La consola no soporta todas las variables; usa API o CloudFormation.

### Inspección TLS

Una **TLS inspection configuration** asociada a la política permite descifrar y reinspeccionar el contenido (certificados de ACM). Con `EnableTLSSessionHolding` se retiene el tráfico hasta evaluar las reglas SNI. **Resolved IP validation** (`Route53ResolvedIPValidation`) comprueba que la IP destino provino de una respuesta del Resolver, para no confiar solo en el SNI o el `Host`, que pueden falsificarse.

> **Ojo.** El filtrado por dominio con SNI/Host **puede ser eludido** por un atacante que manipule esos campos; por eso se recomienda complementar con reglas por IP y con DNS Firewall.

## Modelos de despliegue

| Modelo | Descripción |
|---|---|
| **Distribuido** | Un firewall por VPC, en subredes dedicadas. Máxima autonomía, más costo operativo. |
| **Centralizado (hub-and-spoke)** | Una **VPC de inspección** con el firewall y **Transit Gateway** que enruta el tráfico de las VPC spoke (este-oeste y salida a internet) por ella. Usa modo *appliance* en el attachment para mantener simetría de flujo por AZ. |
| **Ingress** | Para tráfico entrante desde internet, con *ingress routing* (route table asociada al IGW) hacia el endpoint del firewall. |

Administración multicuenta: **AWS Firewall Manager** despliega y gobierna políticas de Network Firewall en la organización.

## Route 53 Resolver DNS Firewall

Filtra las consultas **DNS salientes** de una VPC que pasan por el Route 53 Resolver; solo trabaja con **nombres de dominio**, no con IPs, y **no inspecciona otros protocolos** (por ejemplo HTTPS).

| Concepto | Detalle |
|---|---|
| **Domain lists** | Listas reutilizables propias o **administradas por AWS**. Pueden limitarse a tipos de consulta (por ejemplo, permitir MX). |
| **Rule groups** | Colecciones nombradas de reglas, asociadas a una o más VPC; se evalúan por prioridad (menor número primero) y la primera coincidencia termina la evaluación. |
| **Acciones** | **Allow** (solo reglas con lista de dominios), **Block** (con respuesta personalizable) y **Alert** (registra en los logs del Resolver sin bloquear). |
| **DNS Firewall Advanced** | Detecta amenazas por patrones de consulta: **DGA**, **tunelización DNS**, DGA por diccionario; con umbral de confianza (alto/medio/bajo). |
| **Fallo** | Por defecto el Resolver hace **fail-closed**: si DNS Firewall no responde, bloquea la consulta. Es configurable por VPC. |
| **Alcance** | Cubre las consultas de la VPC y las que llegan desde on-premises a través de endpoints entrantes del Resolver. Es **regional**; los grupos de reglas se pueden compartir entre cuentas. |
| **Monitoreo** | Métricas en CloudWatch, eventos en EventBridge, logs del Resolver. |

> **En el examen.** "Evitar que instancias resuelvan dominios de malware / detectar exfiltración por túneles DNS" → **DNS Firewall** (lista administrada, DNS Firewall Advanced). "Evitar que una instancia se **conecte** a un dominio por IP directa" → Network Firewall, porque DNS Firewall solo ve consultas DNS.

## Patrones de examen

1. **Permitir salida solo a una lista de dominios** → Network Firewall, regla de lista de dominios `Allow` con `STRICT_ORDER` y acción por defecto `aws:drop_strict`.
2. **Inspección centralizada para decenas de VPC** → VPC de inspección + Transit Gateway; `HOME_NET` ampliado.
3. **Bloquear dominios maliciosos y túneles DNS** → DNS Firewall con listas administradas + Advanced.
4. **Inspeccionar contenido cifrado** → TLS inspection configuration.
5. **Reglas IPS personalizadas** → grupos stateful con reglas Suricata.
6. **Políticas homogéneas en toda la organización** → Firewall Manager.

## Referencias

- [Grupos de reglas stateful de lista de dominios](https://docs.aws.amazon.com/network-firewall/latest/developerguide/stateful-rule-groups-domain-names.html)
- [FirewallPolicy (API)](https://docs.aws.amazon.com/network-firewall/latest/APIReference/API_FirewallPolicy.html)
- [Cómo funciona Route 53 Resolver DNS Firewall](https://docs.aws.eu/Route53/latest/DeveloperGuide/resolver-dns-firewall-overview.html)
