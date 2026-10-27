## Idea central

La guía del examen (tarea 5.2) pide implementar **respaldo, ciclo de vida y recuperación** de datos, incluyendo escenarios de **ransomware**. La regla maestra: **copias independientes de la cuenta de producción, inmutables y probadas**.

| Necesidad | Servicio |
|---|---|
| Respaldos centralizados y políticas | **AWS Backup** |
| Snapshots programados de EBS/AMI | **Amazon Data Lifecycle Manager (DLM)** |
| Movimiento y sincronización de datos | **AWS DataSync** |
| Reglas de retención y tiering | **S3 Lifecycle**, ciclo de vida de EFS y FSx |
| Copia inmutable y aislada | Vault Lock / vault *logically air-gapped* (ver *Inmutabilidad de datos*) |

> **En el examen.** "Recuperarse de ransomware aunque el atacante comprometa la cuenta de producción" → **respaldo en una cuenta separada**, con **bloqueo de vault** y, si se requiere, **vault aislado lógicamente**; probar restauración periódicamente.

## AWS Backup

| Capacidad | Detalle |
|---|---|
| **Backup plan** | Frecuencia, ventana, retención, ciclo de vida a frío, vault de destino |
| **Selección de recursos** | Por ARN o **etiquetas** |
| **Cross-Region / cross-account** | Copias a otro vault, Región o cuenta |
| **Gestión central** | Con Organizations: políticas de respaldo para toda la organización |
| **Restore testing** | Pruebas automáticas de restauración |
| **Cifrado** | Cada vault usa una clave KMS; los puntos de recuperación quedan cifrados |
| **Protección** | Vault Lock, vaults *logically air-gapped*, *multi-party approval* |
| **Auditoría** | **Backup Audit Manager** verifica que los respaldos cumplen políticas |

Verificado: los vaults *logically air-gapped* tienen **bloqueo Compliance por defecto** y se cifran con claves AWS-owned; se pueden compartir con otras cuentas para restaurar.

## Diseño anti-ransomware

1. **Cuenta de respaldo separada** (bóveda central) con SCP restrictivas.
2. **Copias cross-account y cross-Region** automáticas.
3. **Inmutabilidad:** Vault Lock Compliance o air-gapped.
4. **Aprobación multiparte** para restauración desde vault aislado.
5. **Versionado + Object Lock** en S3 críticos; replicación a cuenta distinta.
6. **Detección:** GuardDuty (comportamiento anómalo, Malware Protection) y Backup para identificar cambios anómalos.
7. **Pruebas de restauración** programadas y medición de RTO/RPO.
8. **Claves separadas:** la clave KMS del respaldo no debe depender de la cuenta comprometida.

## Data Lifecycle Manager (DLM)

> **Nota de verificación.** Resumen de conocimiento general; no se contrastó con una página específica en esta sesión.

- Automatiza **snapshots de EBS** y **AMIs** por etiquetas y calendario, con retención y copia entre Regiones/cuentas.
- Para respaldos de múltiples servicios o con bloqueo, usa **AWS Backup**.

## AWS DataSync

> **Nota de verificación.** Resumen de conocimiento general.

- Transferencia **gestionada y cifrada en tránsito (TLS)** entre almacenamiento local y AWS (S3, EFS, FSx) o entre servicios AWS.
- Verifica integridad de los datos transferidos; útil para migrar o replicar datos hacia un destino protegido.

## Ciclo de vida

| Servicio | Qué ofrece |
|---|---|
| **S3 Lifecycle** | Transiciones entre clases (IA, Glacier...) y expiración, incluidas versiones no actuales |
| **EFS** | Gestión del ciclo de vida para mover archivos poco usados a clases más baratas |
| **FSx for Lustre** | Integración con S3 como repositorio de datos |
| **Backup** | Paso a *cold storage* y expiración definida en el plan |

Cuidado: **una regla de expiración corta puede ir contra una retención legal**. Object Lock y legal hold **prevalecen** sobre la expiración del ciclo de vida.

## Patrones de examen

1. **Protección ante cuenta comprometida** → copias cross-account con Vault Lock/air-gapped.
2. **Política de respaldo para toda la organización** → AWS Backup con políticas de Organizations.
3. **Snapshots programados de EBS por etiqueta** → DLM (o Backup).
4. **Verificar que los respaldos son restaurables** → restore testing de AWS Backup.
5. **Mover datos on-premises a S3 de forma cifrada y verificada** → DataSync.
6. **Ciclo de vida elimina datos bajo retención legal** → Object Lock/legal hold.

## Referencias

- [AWS Backup: Vault Lock y vaults aislados](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html)
- [Guía de AWS Backup](https://docs.aws.amazon.com/aws-backup/latest/devguide/whatisbackup.html)
