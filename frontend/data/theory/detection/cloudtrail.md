## Qué es

**AWS CloudTrail** registra la **actividad de la API** de tu cuenta (quién hizo qué, desde dónde y cuándo) en consola, CLI, SDK y servicios de AWS. Es la fuente de verdad para auditoría, investigación forense y detección de cambios.

> **En el examen.** CloudTrail responde *"¿quién llamó a esta API?"*. No registra el tráfico de red (eso es VPC Flow Logs) ni el contenido de las aplicaciones (eso es CloudWatch Logs).

## Tipos de eventos

| Tipo | Qué registra | Notas |
|---|---|---|
| **Management events** | Operaciones del **plano de control** (crear, modificar, eliminar recursos; inicios de sesión; cambios de IAM). | Configurables como solo lectura, solo escritura o ambos. |
| **Data events** | Operaciones **sobre los datos** de un recurso (por ejemplo, objetos de S3, invocaciones de Lambda). | Volumen alto y **costo adicional**; se filtran con *advanced event selectors*. |
| **Network activity events** | Actividad de red asociada a recursos de AWS. | Se seleccionan con *advanced event selectors*. |
| **Insights events** | Detectan **tasas inusuales** de llamadas de escritura o de errores respecto a una línea base aprendida. | **Desactivados por defecto**, con costo extra; pueden tardar hasta 36 horas en aparecer la primera vez. |

## Event history frente a trails

| | Event history | Trail |
|---|---|---|
| Configuración | Ninguna, viene incluido | La creas tú |
| Cobertura | Últimos **90 días** de eventos de administración, por región | Continua y sin límite de tiempo en tu almacenamiento |
| Destino | Consola / `LookupEvents` | **S3** (y opcionalmente **CloudWatch Logs** y **EventBridge**) |

Un **trail** entrega archivos de log a un bucket de S3 de forma continua (aproximadamente cada 5 minutos, varias veces por hora).

## Trails multi-región y de organización

- **Trail multi-región:** registra eventos de **todas las regiones habilitadas** y los entrega a **un solo bucket**. Es lo recomendado y lo que crea la consola. Los trails de una sola región solo se crean con CLI o API. Si activas la entrega a CloudWatch Logs, los eventos de todas las regiones van a **un único log group**.
- **Trail de organización (organization trail):** se crea desde la **cuenta de administración** o un **administrador delegado** y registra los eventos de **todas las cuentas** de la organización, aplicándose automáticamente a las cuentas miembro. Los miembros **ven** el trail pero **no pueden modificarlo ni eliminarlo**, y por defecto no tienen acceso a los archivos de log en S3.

> **En el examen.** "Registro centralizado e inmutable para todas las cuentas, incluidas las futuras" → **organization trail** con bucket en una **cuenta de logging dedicada**, cifrado con KMS y con validación de integridad.

## Integridad y protección de los logs

- **Log file integrity validation:** CloudTrail genera **archivos digest** que permiten comprobar que un archivo de log **no se modificó ni se eliminó** desde que se entregó. Se habilita por trail.
- **Cifrado:** los trails creados desde la consola usan **SSE-KMS** de forma predeterminada (también cifra los digest). Si no, aplica el cifrado del lado del servidor de S3. Con una **llave KMS propia**, su política debe permitir a CloudTrail usar la llave y a los lectores descifrar.
- **Bucket de destino:** su política debe permitir a `cloudtrail.amazonaws.com` escribir los logs. Para endurecerlo: acceso solo a roles de seguridad/auditoría, **versionado**, **S3 Object Lock** y **MFA Delete**, replicación a otra cuenta, y reglas de ciclo de vida para la retención.
- **Detección de manipulación:** alerta con EventBridge o una alarma de CloudWatch ante `StopLogging`, `DeleteTrail`, `UpdateTrail` o cambios en el bucket.

## Entrega a CloudWatch Logs y EventBridge

- **CloudWatch Logs:** permite aplicar **metric filters**, alarmas y consultas con Logs Insights sobre las llamadas a la API. Requiere un **rol de IAM** que permita a CloudTrail escribir en el log group.
- **EventBridge:** los eventos de CloudTrail pueden disparar reglas para respuesta casi en tiempo real.

## Cómo investigar con CloudTrail

| Pregunta | Dónde mirar |
|---|---|
| ¿Qué hizo un usuario o rol en los últimos 90 días? | Event history (`LookupEvents`) |
| ¿Quién eliminó un recurso hace seis meses? | Logs del trail en S3, consultados con **Athena** |
| ¿Quién accedió a un objeto concreto de S3? | **Data events** de S3 (si estaban habilitados) |
| Búsquedas SQL ad hoc sobre muchos eventos | **CloudTrail Lake** (siguiente tema) o Athena |
| ¿Qué rol/sesión hizo la llamada? | Campo `userIdentity` (tipo, ARN, `sessionContext`, `sourceIdentity`) |

## Patrones de examen

1. **"Auditar acciones de todas las cuentas de la organización"** → organization trail multi-región.
2. **"Demostrar que los logs no fueron alterados"** → log file integrity validation (+ Object Lock en el bucket).
3. **"Saber quién leyó objetos de un bucket"** → habilitar **data events** de S3 en el trail (por defecto no se registran).
4. **"Detectar picos de llamadas anómalas"** → CloudTrail **Insights**.
5. **"Alertar cuando alguien desactive el logging"** → EventBridge/alarma sobre `StopLogging`/`DeleteTrail`.
6. **"Un miembro de la organización quiere apagar el trail"** → no puede; los trails de organización no se pueden modificar desde las cuentas miembro.
7. **"Los logs no llegan a S3"** → política del bucket, política de la llave KMS, o trail detenido (ver tema de troubleshooting).

## Referencias

- [Cómo funciona CloudTrail](https://docs.aws.eu/awscloudtrail/latest/userguide/how-cloudtrail-works.html)
