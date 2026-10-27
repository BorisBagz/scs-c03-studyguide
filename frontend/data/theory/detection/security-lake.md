## Qué es

**Amazon Security Lake** es un **data lake de seguridad totalmente administrado** que centraliza datos de logs y eventos de seguridad de AWS, SaaS, entornos on-premises, otras nubes y proveedores de terceros en un lago de datos **de tu propia cuenta**. Los datos se guardan en **buckets de S3 que tú posees**.

La guía oficial lo menciona en **1.1.4** (crear métricas y alertas), **1.2.3** (implementar almacenamiento de logs y data lakes e integrar con herramientas de terceros) y **3.1.4** (ingerir datos en formato **OCSF**).

> **En el examen.** Security Lake = **centralizar y normalizar logs de seguridad multicuenta y multirregión en formato OCSF**, para que SIEM y herramientas de análisis los consuman sin transformaciones propias.

## Fuentes

**Fuentes nativas de AWS:**

- CloudTrail (eventos de administración y de datos de S3 y Lambda)
- Logs de auditoría de **Amazon EKS**
- **Route 53 Resolver query logs**
- Hallazgos de **Security Hub CSPM**
- **VPC Flow Logs**
- Logs de **AWS WAF (WAFv2)**

**Fuentes personalizadas (custom sources):** logs de terceros, SaaS u on-premises que se convierten a **OCSF** y **Parquet** y se escriben en el lago.

## Normalización: OCSF y Parquet

- **Open Cybersecurity Schema Framework (OCSF):** esquema abierto y común para eventos de seguridad. Security Lake **transforma a OCSF** los datos de las fuentes nativas de AWS, de modo que servicios y proveedores de terceros los usen **sin postprocesamiento**.
- **Apache Parquet:** el formato columnar en el que se almacenan, con particionado automático. Reduce costos y mejora el rendimiento de las consultas.
- Security Lake crea una **tabla de Lake Formation por cada fuente**, con esquema, particiones y ubicación; **AWS Glue** (crawlers y Data Catalog) mantiene los metadatos.

## Suscriptores

Un **subscriber** es el consumidor de los datos. Hay dos tipos:

| Tipo | Cómo funciona | Quién lo usa |
|---|---|---|
| **Data access** | Recibe **notificaciones** cuando se escriben objetos nuevos en el lago (por **HTTPS endpoint** o consultando una cola **SQS**) y los procesa. | Pipelines propios, SIEM, herramientas de ingestión |
| **Query access** | **Consulta los datos en su lugar** mediante tablas de **Lake Formation**, con **Athena**, Redshift o servicios de terceros integrados con Glue. | Analistas y equipos de investigación |

Reglas importantes:

- El acceso se concede **por fuente**, para controlar costos y aplicar mínimo privilegio.
- Un suscriptor puede tener **hasta 10 fuentes** (AWS y personalizadas).
- Un suscriptor ve solo los datos de la **región en la que se creó**. Para acceso multirregión, créalo en una **región de consolidación (rollup Region)** y haz que las demás regiones **contribuyan** a ella.
- Security Lake crea e intercambia las credenciales necesarias de forma automática.

## Multicuenta, multirregión y residencia de datos

- Puedes habilitar Security Lake de forma **centralizada** en varias regiones y cuentas.
- Las **regiones de consolidación (rollup Regions)** concentran datos de varias regiones, útil para requisitos de **residencia de datos**.
- Cada cuenta o región contribuye a un bucket del lago; la propiedad de los datos es siempre tuya.

## Retención y costo

- **Retención configurable** y **tiering automático** con clases de almacenamiento de S3.
- Seguridad de los datos: son objetos de S3 en tu cuenta, así que aplican las mismas protecciones (cifrado KMS, políticas de bucket, Object Lock donde corresponda).
- No admite **S3 Select**.

## Security Lake frente a otras opciones

| Necesidad | Mejor opción |
|---|---|
| Lago de seguridad **multicuenta**, normalizado en OCSF, con suscriptores | **Security Lake** |
| Consultas SQL sobre actividad de la API | CloudTrail Lake o Athena sobre los logs del trail |
| Revisión y correlación interactiva de logs de aplicación | CloudWatch Logs Insights |
| Búsqueda y visualización a escala | OpenSearch Service (alimentado por un suscriptor) |
| Agregar hallazgos de seguridad para priorizar | Security Hub |

## Patrones de examen

1. **"Centralizar logs de seguridad de toda la organización en un formato estándar"** → Security Lake (OCSF).
2. **"Un SIEM de terceros debe ingerir los logs"** → suscriptor **data access** (notificación + lectura de objetos).
3. **"Los analistas quieren consultar con SQL sin mover los datos"** → suscriptor **query access** con Athena.
4. **"Datos de varias regiones en una sola región por cumplimiento"** → rollup Region.
5. **"Ingerir logs de una aplicación propia o de un SaaS"** → fuente personalizada convertida a OCSF.
6. **"Dar a un suscriptor solo lo que necesita"** → acceso por fuente (mínimo privilegio).

## Referencias

- [Qué es Amazon Security Lake](https://docs.aws.amazon.com/security-lake/latest/userguide/what-is-security-lake.html)
- [Administración de suscriptores](https://docs.aws.amazon.com/security-lake/latest/userguide/subscriber-management.html)
- [Conceptos y terminología](https://docs.aws.amazon.com/security-lake/latest/userguide/service-concepts.html)
