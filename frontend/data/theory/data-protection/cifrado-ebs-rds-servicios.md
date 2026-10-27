## Idea central

Para **cifrar volúmenes, bases de datos y otros servicios** con KMS, el patrón es habilitar el cifrado **al crear el recurso** y fijar **valores predeterminados**. Lo difícil: **muchos recursos no se pueden cifrar después de creados**; hay que copiar o restaurar a uno cifrado.

> **En el examen.** "Hay un volumen/instancia de base de datos sin cifrar y hay que cifrarlo" → **snapshot → copiar el snapshot con cifrado → crear/restaurar desde la copia**. No existe "activar cifrado" sobre el recurso existente (en RDS, tampoco).

## Amazon EBS

Datos verificados de la documentación de EBS:

- Cifra **datos en reposo** y **datos en tránsito entre la instancia y el volumen**, y los **snapshots** y volúmenes creados desde ellos.
- **Cifrado predeterminado** por Región y cuenta: los volúmenes nuevos se crean cifrados.
- **No se puede cambiar la clave de un volumen ni quitarle el cifrado** una vez creado.
- Para cifrar o recifrar: **copiar el snapshot** especificando cifrado o una clave KMS distinta, y crear un volumen desde la copia.
- **Los snapshots cifrados no pueden hacerse públicos.** Para compartir con otra cuenta: clave customer managed y compartir la clave con la cuenta destino (las AWS managed no).
- Una instancia EC2 con volumen cifrado necesita acceso a la clave (la gestión se hace mediante grants).

## Amazon RDS y Aurora

> **Nota de verificación.** Resumen del comportamiento conocido; no se contrastó con una página específica en esta sesión.

| Aspecto | Comportamiento |
|---|---|
| **Cifrado** | Se elige al **crear** la instancia/clúster (KMS); cifra almacenamiento, copias automáticas, réplicas de lectura y snapshots |
| **Instancia sin cifrar** | **No se puede cifrar en el sitio**: snapshot → copia cifrada → restaurar |
| **Réplicas de lectura** | Deben coincidir con el cifrado del origen (en la misma Región) |
| **Snapshot cifrado compartido** | Solo con clave customer managed compartida |
| **TLS en tránsito** | Parámetro del motor (p. ej., `rds.force_ssl` en PostgreSQL) |
| **TDE** | Algunos motores (Oracle, SQL Server) ofrecen TDE propio; CloudHSM en EC2 si el HSM es obligatorio |

## Otros servicios habituales

| Servicio | Cifrado en reposo |
|---|---|
| **DynamoDB** | Siempre cifrado; clave **AWS owned**, **AWS managed** o **customer managed** |
| **EFS** | Se define al crear el sistema de archivos; cifrado en tránsito con el *mount helper* (TLS) |
| **FSx** | Cifrado en reposo con KMS, en tránsito según el tipo de sistema |
| **SQS / SNS** | SSE con KMS (clave AWS managed o customer managed) |
| **CloudWatch Logs** | Cifrado del grupo de logs con KMS asociado |
| **CloudTrail** | SSE-KMS para los archivos de log |
| **Lambda** | Variables de entorno cifradas con KMS; usa Secrets Manager para secretos |
| **Redshift, OpenSearch, MSK, EMR** | Cifrado en reposo con KMS configurable |

## Verificación y gobierno

- **AWS Config:** `encrypted-volumes`, `rds-storage-encrypted`, `efs-encrypted-check`, `dynamodb-table-encrypted-kms`, etc.
- **EBS default encryption** forzada por cuenta y Región; **SCP** que denieguen crear volúmenes/instancias sin cifrar con `ec2:Encrypted`.
- **Security Hub** (*Foundational Security Best Practices*) resume los controles de cifrado.
- **Cross-account:** el servicio en otra cuenta necesita acceso a la clave (key policy + IAM) para leer datos compartidos.

## Patrones de examen

1. **Volumen EBS sin cifrar en producción** → snapshot, copia cifrada, nuevo volumen (cambio de volumen en la instancia).
2. **Exigir que ningún volumen nuevo se cree sin cifrado** → cifrado predeterminado de EBS + SCP/Config.
3. **Compartir un snapshot cifrado con otra cuenta** → clave customer managed + compartir clave y snapshot.
4. **Quitar el cifrado de un volumen** → no se puede; se copia datos a uno nuevo no cifrado (si fuera permitido por política).
5. **RDS sin cifrado** → snapshot → copia cifrada → restaurar → apuntar la aplicación.

## Referencias

- [Cifrado de Amazon EBS](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption.html)
- [Mejores prácticas de cifrado (Prescriptive Guidance)](https://docs.aws.amazon.com/prescriptive-guidance/latest/encryption-best-practices/welcome.html)
