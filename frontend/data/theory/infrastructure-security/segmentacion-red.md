## Idea central

**Segmentar** es dividir la red en zonas con reglas explícitas entre ellas, para que un compromiso en una zona no se propague. La tarea 3.3.4 distingue el tráfico **norte-sur** (entra/sale de la red) del **este-oeste** (entre cargas dentro de la red) y pide saber diseñar **subredes aisladas**.

| Tráfico | Qué es | Controles típicos |
|---|---|---|
| **Norte-sur** | Entre la red e internet / on-premises | CloudFront, WAF, Shield, ALB/NLB, Network Firewall de ingreso/egreso, NAT, VPN/Direct Connect |
| **Este-oeste** | Entre subredes, VPCs y cuentas | Security groups (referenciando SG), NACL, Network Firewall centralizado con Transit Gateway, VPC peering/PrivateLink, microsegmentación |

## Capas de subredes

| Tipo de subred | Ruta a internet | Uso |
|---|---|---|
| **Pública** | Tabla de rutas con 0.0.0.0/0 → **Internet Gateway** | Load balancers, NAT gateways |
| **Privada con salida** | 0.0.0.0/0 → **NAT gateway** (o firewall de egreso) | Servidores de aplicación que necesitan parches/APIs externas |
| **Aislada** | **Sin** ruta a internet (ni IGW ni NAT) | Bases de datos y cargas sensibles; acceso a servicios AWS solo mediante **VPC endpoints** |

> **En el examen.** "La capa de datos no debe tener ninguna ruta a internet pero debe leer de S3 y descifrar con KMS" → subred aislada + **gateway endpoint de S3** + **interface endpoint de KMS** (PrivateLink), con políticas de endpoint.

## Acceso privado a servicios: VPC endpoints

| Tipo | Servicios | Funcionamiento |
|---|---|---|
| **Gateway endpoint** | S3 y DynamoDB | Entrada en la **tabla de rutas** (prefix list); sin costo por hora. |
| **Interface endpoint (PrivateLink)** | La mayoría de servicios AWS y servicios de terceros | ENI con IP privada en tu subred, protegida con **security group**. |

- **Endpoint policy:** política de recursos del endpoint que limita qué principios y recursos son accesibles a través de él (por ejemplo, solo buckets de tu organización con `aws:PrincipalOrgID`).
- **Condición `aws:SourceVpce` / `aws:SourceVpc`** en bucket policies para exigir acceso solo desde el endpoint (ver Dominio 5).
- **PrivateLink para tus propios servicios:** expones un servicio detrás de un NLB a otras VPC/cuentas sin peering ni rutas; la conexión es **unidireccional** del consumidor al proveedor, sin solapamiento de CIDR.

## Conectar VPC sin mezclar redes

| Opción | Características | Cuándo |
|---|---|---|
| **VPC peering** | Uno a uno, **no transitivo**, requiere CIDR sin solapamiento | Pocas VPC con relación simple |
| **Transit Gateway** | Hub-and-spoke, **tablas de rutas** por attachment para segmentar | Muchas VPC / híbrido |
| **PrivateLink** | Expone un servicio, no una red | Servicio compartido con mínima superficie |

**Segmentación con Transit Gateway:** usa **varias tablas de rutas** (por ejemplo, una para producción y otra para desarrollo) y asocia/propaga attachments de modo que producción y desarrollo no tengan ruta entre sí. Para forzar inspección, dirige el tráfico a una **VPC de inspección** con Network Firewall (ver tema *Network Firewall*).

## Principios de diseño

1. **Defensa en profundidad:** SG + NACL + firewall + WAF + endpoints.
2. **Mínimo privilegio de red:** denegar por defecto; abrir puertos específicos entre capas.
3. **Una cuenta por carga/entorno:** AWS Organizations y límites de cuenta son la segmentación más fuerte; combínalos con SCPs.
4. **Egreso controlado:** todo tráfico saliente por NAT + Network Firewall/DNS Firewall (listas de dominios permitidos).
5. **Sin administración por internet:** Session Manager / EC2 Instance Connect Endpoint (ver tema *Acceso administrativo*).
6. **Visibilidad:** VPC Flow Logs, DNS query logs, logs de Network Firewall; análisis con Athena / Security Lake.

## Verificación de la segmentación

- **Network Access Analyzer** con *Network Access Scopes* demuestra, por ejemplo, que los recursos de Finanzas y Desarrollo están aislados, o que las aplicaciones web llegan a internet solo a través de un firewall.
- **Reachability Analyzer** para diagnosticar una ruta puntual.
- **Config** y **Security Hub** para detectar desviaciones (SG abiertos, subredes con IGW no autorizadas).
- Ver tema *Acceso innecesario a la red*.

## Patrones de examen

1. **BD sin ruta a internet** → subred aislada + endpoints.
2. **Inspeccionar tráfico este-oeste entre muchas VPC** → Transit Gateway + VPC de inspección con Network Firewall.
3. **Compartir un servicio con otras cuentas sin exponer la red** → PrivateLink.
4. **Producción y desarrollo sin ruta entre sí** → tablas de rutas separadas en Transit Gateway (y cuentas distintas).
5. **Restringir S3 a la VPC** → gateway endpoint + endpoint policy + bucket policy con `aws:SourceVpce`.
6. **Evitar que el tráfico de aplicación salga a destinos arbitrarios** → egreso por Network Firewall con lista de dominios permitidos.

## Referencias

- [Network Access Analyzer: casos de uso (AWS News Blog)](https://aws.amazon.com/blogs/aws/new-amazon-vpc-network-access-analyzer)
- [Descripción de listas de dominios en Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/stateful-rule-groups-domain-names.html)
- [Private IP VPN sobre Direct Connect (transit gateway)](https://docs.aws.amazon.com/vpn/latest/s2svpn/private-ip-dx)
