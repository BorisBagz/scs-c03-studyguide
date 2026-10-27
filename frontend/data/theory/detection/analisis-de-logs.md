## Idea central

Las habilidades 1.2.4 y 1.2.5 separan dos necesidades:

- **Analizar** logs (consultar, buscar, resumir): **CloudWatch Logs Insights**, **Amazon Athena**, hallazgos de **Security Hub**.
- **Normalizar, parsear y correlacionar** logs de distintas fuentes: **Amazon OpenSearch Service**, **AWS Lambda**, **Amazon Managed Grafana**.

La decisión de diseño habitual depende de **dónde están los datos**, **cuánto volumen hay** y **qué tan interactivo** debe ser el análisis.

| Herramienta | Mejor para | Dónde viven los datos |
|---|---|---|
| **CloudWatch Logs Insights** | Investigación interactiva y reciente de logs ya ingeridos | CloudWatch Logs |
| **Amazon Athena** | SQL sin servidor sobre grandes volúmenes históricos | S3 (CloudTrail, flow logs, ELB, WAF, Security Lake...) |
| **Security Hub** | Revisar y priorizar **hallazgos** (no logs crudos) | Security Hub |
| **OpenSearch Service** | Búsqueda de texto completo, correlación y dashboards casi en tiempo real; base de un SIEM | Dominio de OpenSearch |
| **Lambda** | **Transformar y enriquecer** eventos en el camino (parseo, normalización) | En tránsito |
| **Managed Grafana** | **Visualizar** datos de varias fuentes en paneles | Las fuentes de datos originales |

## CloudWatch Logs Insights

Consultas interactivas con comandos `fields`, `filter`, `stats`, `sort`, `limit`, `parse`. Opera sobre uno o varios log groups (también entre cuentas con observabilidad entre cuentas). Ideal para: *¿cuántos `AccessDenied` por usuario hubo en la última hora?*, *¿qué IPs generan más rechazos?*. Los resultados se pueden guardar como consulta o añadir a un dashboard.

## Amazon Athena

Motor SQL sin servidores sobre datos en **S3**. Es la opción más económica para analizar meses de logs.

- **CloudTrail:** crea una tabla externa sobre el bucket del trail. Con **partition projection** defines de antemano el esquema de particiones por fecha; Athena **agrega particiones nuevas automáticamente** y no necesitas `ALTER TABLE ADD PARTITION`, lo que además reduce el tiempo de consulta.
- **VPC Flow Logs, ELB, WAF, CloudFront:** se consultan igual, con tablas definidas sobre sus prefijos de S3.
- **Costo y rendimiento:** conviene el formato **Parquet** o ORC, **particionar** por fecha y consultar solo las columnas necesarias.
- **Control de acceso:** requiere permisos de Athena, de lectura al bucket de datos, de escritura al bucket de resultados y, si hay KMS, de uso de la llave.
- **Security Lake y CloudTrail Lake federado:** se consultan con Athena mediante tablas de **Lake Formation**.

```sql
SELECT useridentity.arn, eventname, count(*) AS total
FROM cloudtrail_logs_pp
WHERE errorcode = 'AccessDenied'
  AND "timestamp" >= '2026/10/01'
GROUP BY useridentity.arn, eventname
ORDER BY total DESC
LIMIT 20;
```

## Security Hub como herramienta de análisis

En la guía (1.2.4) aparecen los **hallazgos de Security Hub** como fuente de análisis: agrega y correlaciona hallazgos de GuardDuty, Inspector, Macie y controles de postura, y permite filtrarlos, agruparlos en *insights* y priorizar por severidad.

## Amazon OpenSearch Service

Servicio administrado de OpenSearch para **buscar, analizar y visualizar** datos de logs a escala.

- **Ingesta típica:** CloudWatch Logs (*subscription filter*) → **Firehose** → OpenSearch; o S3 → **Lambda** → OpenSearch.
- **Correlación:** busca texto completo y agrega campos entre fuentes (CloudTrail, flow logs, DNS, WAF) para reconstruir una secuencia de eventos. Es la base de soluciones **SIEM** sobre AWS.
- **OpenSearch Dashboards** da visualización y búsqueda interactiva.
- **Seguridad del dominio:**
  - **Fine-grained access control:** restringe por índice, documento y campo; soporta multi-tenancy en Dashboards.
  - **Cifrado en reposo** con KMS (llave administrada por AWS o propia) y **en tránsito** (TLS 1.2 entre nodos; puedes exigir HTTPS a los clientes).
  - **Acceso en VPC:** el endpoint solo es accesible desde tu VPC; los security groups controlan quién se conecta; para llegar a Dashboards desde fuera se requiere VPN o Direct Connect.
  - **Autenticación** nativa con **SAML** y **Amazon Cognito**.
  - **Audit logs** de OpenSearch para solicitudes de datos, y CloudTrail para llamadas de configuración.

## AWS Lambda para normalizar y parsear

Una función Lambda puede **transformar** registros antes de guardarlos: parsear formatos propios, convertir a un esquema común, **enriquecer** (por ejemplo, agregar el nombre de la cuenta o la etiqueta de un recurso a partir de la IP) o filtrar campos sensibles. Puntos de integración habituales:

- **Firehose** con transformación mediante Lambda.
- **Subscription filter** de CloudWatch Logs con Lambda como destino.
- **Eventos de S3** que disparan Lambda cuando llega un archivo de log.

> **En el examen.** Si piden **convertir logs heterogéneos a un esquema común y consultarlos**, piensa en OCSF con **Security Lake** (normalización administrada) o en una canalización con Lambda/Firehose hacia OpenSearch. Si piden **ver paneles** con datos de varias fuentes, Managed Grafana.

## Amazon Managed Grafana

Servicio administrado de **Grafana** para **visualizar y alertar** sobre datos de múltiples fuentes. No almacena tus logs: se conecta a fuentes como **CloudWatch, Athena, OpenSearch Service, Prometheus, X-Ray, Redshift, Timestream** y otras.

**Modos de permisos al crear el workspace:**

| Modo | Qué hace |
|---|---|
| **Service-managed, una cuenta** | Grafana crea el rol (`AmazonGrafanaServiceRole-...`) y una política por cada servicio elegido. |
| **Service-managed, organización** | Crea roles en las cuentas de tu **AWS Organizations** mediante un **StackSet de CloudFormation** (requiere habilitar StackSets como servicio de confianza). Solo para workspaces creados en la cuenta de administración o un administrador delegado (AWS recomienda no usar la de administración). |
| **Customer-managed** | Tú aportas un rol existente cuya trust policy permite a `grafana.amazonaws.com` asumirlo, y le asignas los permisos de cada fuente. |

- **Acceso entre cuentas:** crea un **DataSourceRole** en la cuenta de destino, con relación de confianza con el rol del workspace, y escribe su ARN en el campo *Assume Role ARN* de la fuente de datos.
- Para CloudWatch se adjunta la política administrada `AmazonGrafanaCloudWatchAccess`; para Athena, `AmazonGrafanaAthenaAccess`.

## Cómo elegir

| Necesito... | Uso |
|---|---|
| Consultar rápido los logs recientes de una aplicación | Logs Insights |
| Analizar meses de CloudTrail o flow logs con el menor costo | Athena sobre S3 (Parquet y particiones) |
| Correlacionar eventos de varias fuentes con búsqueda de texto | OpenSearch Service |
| Transformar o enriquecer eventos al vuelo | Lambda (con Firehose o suscripciones) |
| Un panel unificado de CloudWatch, Athena y OpenSearch | Managed Grafana |
| Un lago normalizado en OCSF multicuenta | Security Lake |

## Patrones de examen

1. **"Consultar CloudTrail con SQL de forma económica y sin administrar servidores"** → Athena con partition projection sobre el bucket del trail.
2. **"Dashboards interactivos y búsqueda de texto sobre logs de seguridad"** → OpenSearch Service con Dashboards.
3. **"Visualizar métricas, logs y trazas de varias cuentas en un solo panel"** → Managed Grafana (modo organización) o CloudWatch cross-account.
4. **"Normalizar el formato de logs antes de almacenarlos"** → Lambda en la canalización (o Security Lake para OCSF).
5. **"Proteger el dominio de OpenSearch de acceso desde internet"** → acceso en VPC + fine-grained access control + cifrado.

## Referencias

- [Athena: tabla de CloudTrail con partition projection](https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table-partition-projection.html)
- [Seguridad de OpenSearch Service](https://aws.amazon.com/tr/opensearch-service/features/security/)
- [Permisos de Amazon Managed Grafana](https://docs.aws.amazon.com/grafana/latest/userguide/AMG-manage-permissions.html)
