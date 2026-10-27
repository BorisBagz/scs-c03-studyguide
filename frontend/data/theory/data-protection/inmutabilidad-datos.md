## Idea central

La **inmutabilidad** protege datos contra borrado o modificación, accidental o malintencionada (incluido ransomware o un administrador comprometido). En AWS se logra con **S3 Object Lock**, **Backup Vault Lock**, **Glacier Vault Lock**, **versionado** y **firma de código**.

| Mecanismo | Protege | Modos |
|---|---|---|
| **S3 Object Lock** | Versiones de objetos en S3 | Governance / Compliance + legal hold |
| **AWS Backup Vault Lock** | Puntos de recuperación de un vault | Governance / Compliance |
| **Vault de Backup *logically air-gapped*** | Copias aisladas lógicamente | Compliance por defecto |
| **S3 Glacier Vault Lock** | Vaults de S3 Glacier (servicio original) | Política de bloqueo inmutable |
| **Versionado de S3** | Sobrescrituras y borrados | Marca de borrado, versiones recuperables |
| **AWS Signer** | Integridad del código | Firma y validación |

> **En el examen.** Si el requisito dice **"ni siquiera el usuario root puede borrar"** → **modo Compliance** (Object Lock o Vault Lock). Si dice que algunos usuarios autorizados deben poder saltarse la retención → **modo Governance**.

## S3 Object Lock

Modelo WORM (*write once, read many*). Datos verificados:

- **Requiere versionado** habilitado en el bucket.
- **Modo Governance:** protege contra borrado/modificación; los usuarios con el permiso **`s3:BypassGovernanceRetention`** pueden saltarlo enviando el encabezado `x-amz-bypass-governance-retention:true`.
- **Modo Compliance:** nadie, ni el root, puede eliminar o acortar la retención durante el periodo.
- **Legal hold:** retención **sin fecha de caducidad** que se activa y desactiva (permiso `s3:PutObjectLegalHold`) de forma independiente de la retención.
- **Retención predeterminada** configurable a nivel de bucket.
- Clave de condición **`s3:object-lock-remaining-retention-days`** para exigir en la política qué retención se puede establecer.

## AWS Backup Vault Lock

- Aplica protección **WORM** a los puntos de recuperación del vault.
- **Governance:** se puede modificar o eliminar con permisos adecuados.
- **Compliance:** tras un periodo de gracia (*cooling-off*) el bloqueo se vuelve **inmutable**; ni siquiera AWS puede quitarlo.
- Los vaults ***logically air-gapped*** tienen **bloqueo Compliance por defecto**, se cifran con **claves AWS-owned**, y permiten **compartir** con otras cuentas (por AWS RAM) para restauración.
- **Multi-party approval:** exige que varias personas aprueben la restauración desde un vault aislado.

## S3 Glacier Vault Lock

Política de bloqueo del vault que, una vez **completada**, **no se puede cambiar ni eliminar**. Flujo: iniciar bloqueo (estado *InProgress*, con ventana de 24 h para probar) → completar. Pensado para cumplimiento (por ejemplo, retención regulatoria).

> **Nota de verificación.** Los detalles de Vault Lock de Glacier (ventana de 24 h) son conocimiento general, no se contrastaron en esta sesión.

## Versionado y MFA Delete

- El **versionado** conserva versiones previas; un `DELETE` crea una *delete marker*.
- **MFA Delete** exige MFA del root para eliminar versiones o cambiar el estado de versionado (solo configurable por el root vía CLI/API).
- El versionado **no basta** contra un administrador malicioso: combínalo con Object Lock y replicación a otra cuenta.

## AWS Signer (integridad del código)

- Servicio de **firma de código** gestionado: certificados de firma, perfiles de firma y trabajos de firma (registrados en CloudTrail).
- **Lambda code signing:** configuras una *code signing configuration* que solo permite desplegar paquetes firmados por perfiles de confianza.
- **Contenedores:** firma de imágenes con Notation (formato OCI).
- También para **IoT/FreeRTOS** (actualizaciones de firmware).

## Patrones de examen

1. **Registros que no puedan alterarse durante 7 años por regulación** → S3 Object Lock en Compliance (versionado habilitado).
2. **Retención de evidencia forense hasta nueva orden** → legal hold.
3. **Copia de seguridad a prueba de ransomware aunque se comprometa la cuenta** → vault *logically air-gapped* o Vault Lock en Compliance + copia a otra cuenta/Región.
4. **Evitar que Lambda ejecute código no aprobado** → code signing con AWS Signer.
5. **Un administrador autorizado debe poder eliminar en una emergencia** → modo Governance con permiso de bypass.

## Referencias

- [Bloqueo de objetos de S3 (Object Lock)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
- [AWS Backup Vault Lock](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html)
- [Vaults aislados lógicamente en AWS Backup](https://docs.aws.amazon.com/aws-backup/latest/devguide/logicallyairgappedvault.html)
- [AWS Signer](https://docs.aws.amazon.com/signer/latest/developerguide/Welcome.html)
