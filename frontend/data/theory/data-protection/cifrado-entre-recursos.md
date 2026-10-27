## Idea central

Además de TLS en el borde (ver *TLS, ELB y ACM*), la tarea 5.1 pide proteger el tráfico **entre recursos**: dentro de una VPC, entre VPC, entre Regiones y hacia los servicios de AWS. Hay tres capas que conviene distinguir:

| Capa | Quién la aplica | Ejemplo |
|---|---|---|
| **Física / red global de AWS** | AWS, automática | Todo el tráfico entre Regiones y entre AZ |
| **Red (Nitro)** | Hardware Nitro, automática en tipos de instancia compatibles | Tráfico entre instancias EC2 |
| **Aplicación (TLS)** | **Tú** | HTTPS, TLS hacia bases de datos, endpoints de servicios de AWS |

> **En el examen.** "Garantizar que **todo** el tráfico dentro de la VPC esté cifrado y bloquear el que no lo esté" → **VPC Encryption Controls en modo enforce**. "Cifrar tráfico entre instancias sin tocar las aplicaciones" → **instancias Nitro compatibles** (misma Región, misma VPC o VPC *peered*, sin dispositivo intermedio).

## Cifrado entre instancias EC2 (Nitro)

Según la guía de EC2, AWS ofrece conectividad privada entre instancias de todos los tipos, y **algunos tipos de instancia** usan el hardware Nitro para **cifrar automáticamente** el tráfico entre instancias con algoritmos **AEAD de 256 bits**, sin impacto en el rendimiento. Requisitos:

- Tipos de instancia compatibles (familias como M6i/M7i, C6i/C7i, R6i/R7i, Graviton M7g/C7g/R7g, entre otras; **la lista crece**: se consulta con `aws ec2 describe-instance-types --filters Name=network-info.encryption-in-transit-supported,Values=true`).
- **Misma Región**.
- Misma VPC o **VPC *peered***, y el tráfico **no pasa por un dispositivo o servicio de red** como un balanceador o un Transit Gateway.

## Otras capas de cifrado en tránsito (EC2)

| Caso | Comportamiento |
|---|---|
| **Entre Regiones** (red global de AWS) | Cifrado automático a nivel físico antes de salir de las instalaciones seguras de AWS |
| **Entre AZ** | Todo el tráfico entre AZ está cifrado |
| **VPC peering y Transit Gateway peering entre Regiones** | Cifrado masivo automático al salir de la Región (más la capa física) |
| **Outposts ↔ Región** | Los *service links* van totalmente cifrados |
| **Acceso remoto** | SSH/RDP cifrados; **Session Manager y Run Command** usan TLS 1.2 y las solicitudes se firman con SigV4 |
| **Datos de aplicación** | **Responsabilidad tuya**: usar TLS entre clientes e instancias |

Cifrado en reposo local de EC2 (útil para preguntas de "qué ya viene cifrado"):

- **Instance store NVMe:** cifrado XTS-AES-256 por hardware; claves por cliente y por volumen que **residen solo en el módulo de hardware** y se destruyen al detener o terminar la instancia; **no se puede desactivar ni aportar tu propia clave**.
- **Memoria:** cifrado siempre activo en instancias **Graviton2 o posteriores**, Intel Ice Lake/Sapphire Rapids (TME) y AMD Milan/Genoa (SME). **AMD SEV-SNP** disponible en algunos tipos.
- **Volúmenes EBS:** con KMS (ver *Cifrado en EBS, RDS y otros servicios*).

## VPC Encryption Controls

Función de Amazon VPC para **auditar y hacer cumplir** el cifrado en tránsito dentro y entre VPC de una Región (fuente: blog de lanzamiento de AWS).

| Modo | Efecto |
|---|---|
| **Monitor** | Audita y detecta recursos que permiten tráfico en texto plano; añade el campo **`encryption-status`** a los **VPC Flow Logs** |
| **Enforce** | Exige que todos los recursos cumplan antes de activarse; después, los recursos nuevos solo se crean en instancias Nitro compatibles y **se descarta el tráfico sin cifrar** |

Valores de `encryption-status`: **0** = texto plano; **1** = cifrado en capa de red por Nitro; **2** = cifrado en capa de aplicación (TLS, puerto 443); **3** = ambas; **"-"** = controles desactivados o sin información.

Flujo recomendado:

1. Crear el control para la VPC (`aws ec2 create-vpc-encryption-control --vpc-id ...`); **un control por VPC**.
2. Habilitar flow logs con `encryption-status` y revisar resultados.
3. Identificar lo que bloquea el modo enforce (`aws ec2 get-vpc-resources-blocking-encryption-enforcement --vpc-id ...`).
4. Migrar esos recursos (por ejemplo, a tipos Nitro) y pasar a enforce (`aws ec2 modify-vpc-encryption-control --vpc-id ... --mode enforce`).
5. Con **Transit Gateway**, habilitar también los controles en el TGW manualmente.

Detalles verificados:

- Se pueden **excluir los internet gateways y NAT gateways** (su tráfico sale de la red de AWS y no se puede cifrar); otros recursos no.
- Servicios de AWS por **PrivateLink y gateway endpoints** aceptan solo TLS (cifrado en capa de aplicación).
- Requieren migrar a instancias Nitro: EC2, Auto Scaling, RDS, ElastiCache por nodos, Redshift provisionado (nuevo clúster desde snapshot), ECS en EC2, MSK Provisioned, OpenSearch, EMR. NLB, ALB, Fargate y EKS se migran automáticamente en modo monitor.
- Disponible solo en **ciertas Regiones**; el blog indicaba gratuidad hasta el 28-feb-2026 y luego tarifa por hora por VPC (**verifica precio y Regiones vigentes**, no son contenido de examen).

## PrivateLink, endpoints de VPC y VPN

> **Nota de verificación.** Esta sección resume conocimiento general y no se contrastó en esta sesión con una página específica; los detalles de cobertura del examen están en el *Exam guide*.

| Mecanismo | Para qué |
|---|---|
| **Gateway endpoint** (S3, DynamoDB) | Ruta privada sin pasar por internet; se controla con política del endpoint y `aws:SourceVpce` |
| **Interface endpoint (PrivateLink)** | ENI privada hacia servicios de AWS o de terceros; permite exponer **tu** servicio a otras VPC/cuentas sin peering |
| **Política del endpoint** | Restringe qué principales, acciones y recursos pasan por el endpoint (perímetro de datos, ver *Estrategia de borde*) |
| **Site-to-Site VPN / Client VPN** | Túneles IPsec / TLS hacia redes y usuarios (ver *Conectividad híbrida*) |
| **Verified Access** | Acceso a aplicaciones sin VPN (ver tema propio) |

## Cifrado entre nodos en servicios gestionados

> **Nota de verificación.** Los puntos de EMR, EKS y SageMaker no se pudieron confirmar en esta sesión (la página de EMR consultada no cargó). Es el patrón general; verifica en la guía de cada servicio.

- **Amazon EMR:** el cifrado en tránsito se activa mediante una **configuración de seguridad** con certificados TLS (aportados por ti o generados), junto con el cifrado en reposo.
- **Amazon EKS:** tráfico pod-a-pod no está cifrado por defecto; se resuelve con **malla de servicio** (mTLS), plugins CNI con cifrado o instancias Nitro compatibles.
- **Amazon SageMaker:** opción de **cifrado del tráfico entre contenedores** en trabajos de entrenamiento distribuido (requiere configuración de VPC).

## Patrones de examen

1. **Cumplimiento exige cifrado de todo el tráfico intra-VPC, con evidencia** → VPC Encryption Controls (monitor → enforce) y flow logs con `encryption-status`.
2. **Tráfico entre dos instancias que pasa por un balanceador no queda cifrado por Nitro** → usar TLS en la aplicación.
3. **Acceso privado a S3 sin internet y limitado a tu organización** → gateway endpoint + política del endpoint.
4. **Replicar entre Regiones: ¿hay que cifrar la red?** → el tráfico por la red global ya se cifra a nivel físico; el cifrado de aplicación es adicional.
5. **Datos en instance store: ¿cómo se cifran?** → automático con XTS-AES-256, sin clave gestionable.

## Referencias

- [Protección de datos en Amazon EC2 (cifrado en tránsito)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/data-protection.html)
- [Blog: VPC Encryption Controls](https://aws.amazon.com/blogs/aws/introducing-vpc-encryption-controls-enforce-encryption-in-transit-within-and-across-vpcs-in-a-region/)
