## Idea central

**AWS KMS** crea y controla claves criptográficas. Casi todos los servicios de AWS lo usan para cifrar en reposo (S3, EBS, RDS, Secrets Manager...). Para el examen importa: **tipos de clave, quién las controla, cómo se autoriza el uso (key policy + IAM + grants), rotación, eliminación y buenas prácticas**.

> **En el examen.** En KMS el acceso se decide **primero por la key policy**. Una política IAM sola no basta: la key policy debe permitirlo (directamente o delegando en IAM con la declaración que otorga acceso a la cuenta). Si la pregunta dice "el rol tiene `kms:Decrypt` pero recibe AccessDenied", piensa en **key policy, grants o política entre cuentas**.

## Tipos de clave KMS

| Criterio | Opciones |
|---|---|
| **Quién la gestiona** | **AWS owned** (invisible, sin costo), **AWS managed** (`aws/s3`, `aws/ebs`...; creadas por el servicio en tu cuenta, no editas su política), **Customer managed** (tú controlas política, rotación, eliminación) |
| **Tipo criptográfico** | **Simétrica** (AES-256-GCM, la predeterminada), **asimétrica** (RSA, ECC; cifrado o firma), **HMAC** |
| **Origen del material** | KMS (AWS_KMS), **importado** (EXTERNAL), **CloudHSM** o **almacén de claves externo (XKS)** |
| **Alcance** | Una Región, o **multi-Region** |

Datos verificados de la documentación:

- **La rotación automática solo aplica a claves simétricas con material de origen AWS_KMS.**
- **Multi-Region** está soportado para todos los tipos de clave, pero **no en almacenes de claves personalizados**.
- **Material importado** está soportado con una excepción (tipos ML-KEM).
- Los **almacenes de claves personalizados** (CloudHSM/XKS) soportan **solo claves simétricas**.

## Cifrado de sobre (envelope encryption)

KMS cifra directamente hasta 4 KB. Para datos grandes los servicios usan **claves de datos**: KMS genera una data key (`GenerateDataKey`), se cifra el dato con la clave en claro, se guarda la data key **cifrada** junto al dato y se descarta la copia en claro. Para descifrar: `Decrypt` de la data key y luego el dato. Ventaja: el dato nunca viaja a KMS y las claves maestras nunca salen de KMS.

## Cómo se autoriza el uso

| Mecanismo | Rol |
|---|---|
| **Key policy** | Documento obligatorio de la clave; controla administradores y usuarios. Sin ella, nadie accede |
| **Políticas IAM** | Funcionan solo si la key policy lo habilita (declaración de la cuenta/IAM) |
| **Grants** | Delegación **programática y temporal** para una sola clave (la usan los servicios como EBS o RDS) |
| **Cuentas externas** | Hacen falta **ambas**: key policy que permite a la otra cuenta e IAM en la otra cuenta |

Condiciones útiles en políticas de claves: **`kms:ViaService`** (solo a través de un servicio, p. ej. S3), `kms:CallerAccount`, `kms:EncryptionContext:*`, `kms:GrantIsForAWSResource`.

### Encryption context

Pares clave-valor **no secretos** que se vinculan criptográficamente al texto cifrado (datos autenticados adicionales). Debes pasar el mismo contexto para descifrar. Sirve para restringir y auditar el uso. **No pongas datos sensibles**: aparece en **texto claro en CloudTrail**.

## Rotación

| Tipo | Rotación |
|---|---|
| Claves **customer managed** simétricas con material de KMS | Automática opcional, el ID/ARN de la clave **no cambia** y el material anterior se conserva para descifrar |
| Claves **AWS managed** | Rotadas automáticamente por AWS |
| **Importadas, asimétricas, HMAC, almacenes personalizados** | **Sin rotación automática** → rotación manual (nueva clave + alias) |

> **Nota de verificación.** Los periodos exactos (anual por defecto, configurable entre 90 y 2 560 días en claves customer managed; AWS managed anual) vienen de conocimiento general, no de las páginas consultadas hoy. Verifica antes de citarlos como cifra.

## Eliminación y desactivación

- **Deshabilitar** es reversible y bloquea el uso inmediatamente.
- **Programar la eliminación**: periodo de espera de **7 a 30 días**, tras el cual la clave y todo lo cifrado con ella son **irrecuperables**.
- Detección: alarma de CloudWatch/EventBridge sobre `ScheduleKeyDeletion`; bloqueo preventivo con **SCP**.

## Buenas prácticas verificadas

1. **No uses `kms:*`**; otorga solo las acciones necesarias.
2. **Separa administradores y usuarios** de la clave.
3. Limita con **`kms:ViaService`**.
4. Usa **grants** para delegación temporal sobre una sola clave.
5. **Sin datos sensibles en el encryption context.**
6. **SCP** para impedir eliminar claves o cambiar políticas críticas.
7. Reglas de **Config**: `iam-customer-policy-blocked-kms-actions` e `iam-inline-policy-blocked-kms-actions` detectan políticas IAM que permiten acciones KMS bloqueadas.
8. En **claves multi-Region** la key policy **no se comparte** entre la primaria y las réplicas.

## Monitoreo

- **CloudTrail** registra todas las llamadas a KMS (por defecto en el historial de eventos).
- **EventBridge**: eventos de rotación, eliminación e importación caducada.
- **Config / Security Hub** para controles sobre rotación y acceso.

## Patrones de examen

1. **Un servicio de otra cuenta debe descifrar objetos cifrados** → clave **customer managed** (las AWS managed no se comparten entre cuentas) + key policy e IAM.
2. **Impedir que se borre una clave** → SCP deny sobre `kms:ScheduleKeyDeletion`; alarma sobre el evento.
3. **Usar la clave solo a través de S3** → `kms:ViaService`.
4. **Necesito rotación automática y la clave es importada** → no existe; rotación manual con nueva clave y alias.
5. **AccessDenied aunque IAM permite** → revisar key policy.
6. **Alguien eliminó una clave y datos inaccesibles** → solo se recupera cancelando la eliminación dentro del periodo de espera.

## Referencias

- [Mejores prácticas de AWS KMS](https://docs.aws.amazon.com/prescriptive-guidance/latest/encryption-best-practices/kms.html)
- [Tipos de claves en AWS KMS](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html)
