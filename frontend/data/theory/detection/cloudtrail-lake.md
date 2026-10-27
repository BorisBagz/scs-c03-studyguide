## Qué es

**AWS CloudTrail Lake** es un almacén administrado de eventos, consultable con **SQL**, que reemplaza el ciclo "entregar a S3 → catalogar → consultar con Athena" por un servicio integrado. Guarda eventos en **event data stores** que son **inmutables**.

> **Nota de disponibilidad.** Según la documentación de AWS, CloudTrail Lake **no está abierto a clientes nuevos desde el 31 de mayo de 2026**; los clientes existentes pueden seguir usándolo. Sigue apareciendo en la lista de servicios del examen, por lo que conviene conocer sus conceptos. En proyectos nuevos, evalúa alternativas como trails en S3 con Athena o Security Lake.

## Conceptos

| Concepto | Descripción |
|---|---|
| **Event data store (EDS)** | Colección inmutable de eventos, seleccionados con *advanced event selectors*. |
| **Eventos soportados** | Eventos de CloudTrail (administración, datos y actividad de red), **Insights**, evidencia de **Audit Manager**, **elementos de configuración de AWS Config** y **eventos de fuera de AWS** (híbridos, on-premises, socios). |
| **Retención** | Cada EDS define un período; los eventos se eliminan cuando su `eventTime` supera la retención. El modelo de precios elegido fija la retención predeterminada y máxima. |
| **Consultas** | **SQL** (instrucciones `SELECT` de Trino). Puedes escribirlas, partir de ejemplos o generarlas con lenguaje natural. |
| **Dashboards** | 14 administrados (no editables, pero se pueden guardar como personalizados) y personalizados con hasta 10 widgets. *Highlights* resume la actividad cada 6 horas y puede mostrar anomalías como acceso entre cuentas inusual. |
| **Protección contra eliminación** | La protección de terminación está **activada por defecto**. |

## Federación con Athena

La **federación** expone los metadatos del EDS en el **AWS Glue Data Catalog** para consultar los datos desde **Amazon Athena**. Al habilitarla, CloudTrail:

1. Crea la base `aws:cloudtrail` en Glue (si no existe).
2. Crea una **tabla federada** cuyo nombre es el ID del EDS.
3. Registra el rol de federación y el EDS en **AWS Lake Formation**, que gestiona el control de acceso detallado.

Puntos de examen sobre federación:

- Los usuarios de Athena necesitan `lakeformation:GetDataAccess` (lo incluye la política administrada `AmazonAthenaFullAccess`).
- El **rol de federación** necesita `cloudtrail:GetEventDataStoreData` y, si el EDS usa KMS, `kms:Decrypt` y `kms:GenerateDataKey`. Su trust policy debe confiar en `lakeformation.amazonaws.com`.
- CloudTrail **no cobra** por federar; Athena cobra por las consultas.
- Si borras el rol o revocas permisos de Glue o Lake Formation, las consultas de Athena **fallan**.
- No puedes crear vistas de Athena sobre tablas de la base `aws:cloudtrail`; usa otra base.
- Para eliminar un EDS federado, primero deshabilita la federación (y la protección de terminación).
- En un EDS de **organización**, solo la cuenta de administración o **un** administrador delegado puede habilitar la federación.

## Integraciones (eventos de fuera de AWS)

Las **integrations** ingieren eventos externos mediante **channels** y la API `PutAuditEvents`. Pueden ser **directas** (el socio llama a la API) o de **solución** (una aplicación en tu cuenta la llama). Los canales pueden usar **políticas basadas en recursos** para controlar qué fuentes pueden enviar eventos.

## Lake frente a trail + Athena

| | CloudTrail Lake | Trail + S3 + Athena |
|---|---|---|
| Almacenamiento | Administrado, inmutable | Tu bucket S3 |
| Consultas | SQL integrado | Athena (tú creas la tabla, o usas federación) |
| Fuentes | CloudTrail, Config, Audit Manager, externas | Principalmente CloudTrail |
| Retención | Por EDS, según el modelo de precios | Tú la defines con ciclo de vida |
| Esfuerzo operativo | Menor | Mayor, pero más control y costo por GB más bajo |

## Patrones de examen

1. **"Consultar con SQL actividad de la API de muchos meses con el menor esfuerzo operativo"** → CloudTrail Lake (si está disponible) o trail + Athena.
2. **"Reutilizar los datos de Lake en Athena junto con otros datos"** → federación (Glue + Lake Formation).
3. **"Ingerir eventos de auditoría de aplicaciones on-premises en un mismo lugar"** → integración de CloudTrail Lake con `PutAuditEvents`.
4. **"Evitar la eliminación accidental del almacén de eventos"** → protección de terminación (activada por defecto).

## Referencias

- [Conceptos y terminología de CloudTrail Lake](https://docs.aws.eu/awscloudtrail/latest/userguide/cloudtrail-lake-concepts.html)
- [Federar un event data store](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/query-federation.html)
