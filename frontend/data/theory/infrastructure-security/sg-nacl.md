## Idea central

Los **security groups (SG)** y las **network ACLs (NACL)** son los controles de red nativos de la VPC. Se complementan: el SG es el control principal y granular a nivel de recurso; la NACL es una capa gruesa a nivel de subred, útil para **denegar explícitamente**.

> **En el examen.** Casi toda pregunta de este tema se resuelve con tres ideas: **SG = stateful, solo allow, a nivel de interfaz de red**; **NACL = stateless, allow y deny, a nivel de subred**; y **bloquear una IP concreta solo se puede con NACL** (o con un firewall/WAF), porque los SG no tienen reglas de denegación.

## Comparación

| | **Security group** | **Network ACL** |
|---|---|---|
| Nivel | Interfaz de red (ENI) del recurso: EC2, RDS, ECS, Lambda en VPC, endpoints... | **Subred** (afecta a todo lo que hay en ella) |
| Estado | **Stateful**: la respuesta a un tráfico permitido se permite automáticamente | **Stateless**: hay que permitir **ida y vuelta** (incluidos puertos efímeros) |
| Tipo de regla | **Solo allow** | **Allow y deny** |
| Evaluación | Se evalúan **todas** las reglas; si alguna permite, pasa | Por **número de regla ascendente**; gana la primera que coincide |
| Por defecto | Entrada denegada, salida permitida | La NACL por defecto de la VPC **permite todo**; una NACL **nueva** personalizada **deniega todo** hasta añadir reglas |
| Origen/destino | IPs, CIDR, prefix lists, **otro security group** | Solo CIDR |
| Asociación | Varios SG por ENI | Una NACL por subred; una NACL puede servir a varias subredes |

(Los límites de reglas y de SG por interfaz son cuotas ajustables; consulta las cuotas vigentes de VPC antes de citar cifras.)

### Referenciar otro security group

Una regla puede usar **otro SG como origen**: "permite 3306 desde el SG de la capa de aplicación". Esto sigue a las instancias aunque cambien de IP y es la base de la **segmentación por capas** (web → app → base de datos).

### Puertos efímeros en NACL

Como la NACL no recuerda conexiones, la regla de entrada para, por ejemplo, el 443 requiere una regla de **salida** para los puertos efímeros del cliente (típicamente 1024–65535), y viceversa. Olvidar esto causa "conectividad intermitente" o timeouts en preguntas de troubleshooting.

## Cuándo usar cada uno

| Necesidad | Control |
|---|---|
| Aislar capa de aplicación de la de datos | SG con referencia a SG |
| Bloquear una IP o rango atacante | **NACL** (regla deny con número bajo) |
| Controlar tráfico entre subredes de forma gruesa | NACL |
| Inspección profunda, filtrado por dominio, IPS | **Network Firewall** (ver tema) |
| Filtrar HTTP(S) por contenido | WAF |

## Troubleshooting típico

1. **¿Funciona en una dirección pero no vuelve?** Sospecha de NACL (stateless) o de la tabla de rutas.
2. **Una instancia no es alcanzable desde internet:** revisa, en orden, IGW adjunto, tabla de rutas de la subred (0.0.0.0/0 → IGW), IP pública/Elastic IP, SG de entrada, NACL de entrada **y** salida.
3. **VPC Flow Logs:** registros `ACCEPT`/`REJECT` indican si el rechazo vino de SG o NACL (un REJECT con tráfico de respuesta suele indicar NACL).
4. **Reachability Analyzer** analiza la ruta lógica entre dos recursos e indica qué componente la bloquea (ver tema *Acceso innecesario a la red*).

## Buenas prácticas

- Mínimo privilegio: sin `0.0.0.0/0` en puertos de administración (22, 3389); preferir Session Manager (ver tema *Acceso administrativo*).
- Un SG por función; nombres y etiquetas descriptivos.
- Usar **prefix lists** administradas (por ejemplo, la de CloudFront) en lugar de listas largas de IPs.
- Detección continua con **AWS Config** (reglas para puertos abiertos) y gobierno con **Firewall Manager** (políticas de security groups comunes, auditoría y remediación).

## Patrones de examen

1. **Bloquear una IP maliciosa** → regla deny en NACL.
2. **Solo la capa web puede hablar con la capa de aplicación** → SG de la app que referencia al SG de la web.
3. **Tráfico entra pero la respuesta no sale** → falta la regla de salida con puertos efímeros en la NACL.
4. **Auditar y corregir SG abiertos en toda la organización** → Firewall Manager (política de security groups) + Config.
5. **Permitir tráfico de CloudFront al ALB** → prefix list administrada de CloudFront en el SG.

## Referencias

- [Ejemplo: controlar acceso a instancias en una subred (NACL)](https://docs.aws.eu/vpc/latest/userguide/nacl-examples.html)
