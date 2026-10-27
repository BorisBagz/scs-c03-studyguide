## Idea central

Cifrar **datos en tránsito** significa proteger las conexiones con TLS: elegir versiones y cifrados adecuados, gestionar certificados y **forzar HTTPS** de extremo a extremo. En AWS esto se concreta con **políticas de seguridad de Elastic Load Balancing**, **AWS Certificate Manager (ACM)** y condiciones de política como `aws:SecureTransport`.

> **En el examen.** Si la pregunta menciona "cumplir un requisito de TLS 1.2 o superior", "FIPS" o "forward secrecy" en un load balancer, la respuesta es **elegir la política de seguridad correcta del listener**. Si habla de renovar certificados sin intervención manual, es **ACM**.

## Políticas de seguridad del ALB

Una política define qué **protocolos y cifrados** acepta el listener HTTPS. El ALB **no admite políticas personalizadas**: eliges entre las predefinidas.

| Aspecto | Detalle |
|---|---|
| **Predeterminada** | Depende de cómo se cree el listener: la consola usa `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`; CLI, CloudFormation y CDK usan `ELBSecurityPolicy-2016-08`, **anticuada**, que admite TLS 1.0 y 1.1. Conclusión: **especifica siempre la política** en IaC. |
| **Recomendada de uso general** | `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` (TLS 1.3 y 1.2, intercambio híbrido post-cuántico). |
| **FIPS** | `ELBSecurityPolicy-TLS13-1-2-Res-FIPS-PQ-2025-09`; las políticas con "FIPS" usan el módulo criptográfico validado AWS-LC. |
| **Solo TLS 1.3** | `ELBSecurityPolicy-TLS13-1-3-PQ-2025-09` o `ELBSecurityPolicy-TLS13-1-3-2021-06`. |
| **RFC 9151 (CNSA 1.0)** | Empezar con la variante `INTEROP` y migrar a las estrictas. |
| **TLS 1.0/1.1** | Solo en políticas legadas o de la familia "1-0"/"1-1"; evítalas salvo requisito de clientes antiguos. |

- **Forward secrecy:** las políticas solo TLS 1.3 la ofrecen; las de TLS 1.3 + 1.2 la ofrecen si sus cifrados son solo `TLS_*` y `ECDHE_*`.
- **Post-quantum (PQ):** nombres con "PQ" ofrecen intercambio híbrido ML-KEM junto a algoritmos clásicos; el cliente debe soportar ML-KEM para usarlo, pero la política también acepta clientes TLS 1.3 y TLS 1.2 sin PQ.
- **Conexiones hacia los destinos (backend):** la política del backend queda determinada por la del listener y no se elige directamente; los destinos deben soportarla. El ALB no puede imponer RFC 9151 en las conexiones salientes.
- **Antes de endurecer:** habilita los *connection logs* y revisa `tls_protocol`, `tls_cipher` y `tls_keyexchange` para ver qué negocian los clientes reales.
- **Gobierno:** se puede limitar qué políticas pueden elegir los usuarios con claves de condición de Elastic Load Balancing y **SCP**.

(La página consultada trata ALB; el NLB tiene su propio catálogo de políticas, revisa la documentación del NLB.)

## AWS Certificate Manager (ACM)

| Característica | Detalle |
|---|---|
| **Certificados públicos** | Gratuitos para servicios integrados; validación por **DNS** (recomendada, permite renovación automática) o correo. |
| **Renovación administrada** | ACM renueva automáticamente los certificados que emitió mientras sigan en uso y validables. |
| **Certificados privados** | Emitidos desde **AWS Private CA** (ver tema). |
| **Importar** | Puedes importar certificados de terceros; **ACM no renueva** los importados (hay que reimportar). |
| **Integraciones** | CloudFront, ALB/NLB, API Gateway, entre otros. Los certificados públicos de ACM no se pueden instalar directamente en una instancia EC2 (existe una opción de certificados exportables; verifícala en la guía vigente). |
| **CloudFront** | El certificado debe estar en **us-east-1**. |

## Forzar cifrado en tránsito

| Control | Cómo |
|---|---|
| **Redirigir HTTP→HTTPS** | Regla del listener del ALB (acción de redirección 301) |
| **Solo HTTPS en CloudFront** | *Viewer protocol policy* |
| **S3** | Bucket policy que **deniega** si `aws:SecureTransport` es `false` |
| **API Gateway** | Los endpoints son HTTPS; el dominio personalizado exige certificado ACM |
| **Bases de datos** | Parámetro de servidor para exigir SSL/TLS (por ejemplo, `rds.force_ssl` en PostgreSQL) |
| **TLS mutuo (mTLS)** | ALB y API Gateway permiten autenticar también al cliente con certificados |
| **Detección** | Reglas de Config como `s3-bucket-ssl-requests-only`, `alb-http-to-https-redirection-check` |

Ejemplo (documentación de S3): denegar todo si no es TLS.

```json
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": ["arn:aws:s3:::example-bucket", "arn:aws:s3:::example-bucket/*"],
  "Condition": { "Bool": { "aws:SecureTransport": "false" } }
}
```

## Dónde termina el TLS

| Opción | Efecto |
|---|---|
| **Terminación en el balanceador** | Descarga criptográfica; el tráfico hacia el destino puede ir en claro si no se configura HTTPS al backend |
| **Re-cifrado hacia el destino** | Listener HTTPS → destino HTTPS (extremo a extremo hasta la aplicación) |
| **Passthrough (NLB TCP/TLS)** | El balanceador no descifra; el destino termina TLS |

## Patrones de examen

1. **Cumplir PCI/NIST exigiendo TLS 1.2+ y sin cifrados débiles** → política reciente en el listener (no `ELBSecurityPolicy-2016-08`).
2. **Requisito FIPS 140 en el balanceador** → política con "FIPS".
3. **Certificados que se renuevan solos** → ACM con validación DNS.
4. **Evitar que un bucket sea accedido sin TLS** → `aws:SecureTransport`.
5. **Cifrado hasta la aplicación y no solo hasta el ALB** → re-cifrado o TLS passthrough con NLB.
6. **IaC despliega un ALB con TLS 1.0 por defecto** → fijar `SslPolicy` explícitamente.

## Referencias

- [Políticas de seguridad del Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html)
- [Mejores prácticas de cifrado en S3](https://docs.aws.amazon.com/prescriptive-guidance/latest/encryption-best-practices/s3.html)
- [Renovación administrada de certificados en ACM](https://docs.aws.eu/acm/latest/userguide/managed-renewal.html)
