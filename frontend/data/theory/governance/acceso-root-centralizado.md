## Idea central

Cada cuenta de AWS tiene un **usuario root** con permisos que no se pueden limitar con IAM. En una organización con decenas de cuentas, gestionar contraseñas, claves y MFA de cada root es un riesgo. El **acceso root centralizado** (IAM + Organizations) lo resuelve con dos funciones:

| Función | Qué hace |
|---|---|
| **Gestión de credenciales root** | Supervisar, **eliminar** y **bloquear la recuperación** de credenciales root de larga duración en cuentas miembro (contraseña de consola, claves de acceso, certificados de firma, dispositivos MFA) |
| **Acciones root privilegiadas (root sessions)** | Realizar tareas root concretas desde la cuenta de administración o la delegada mediante **sesiones de corta duración y alcance limitado** |

> **En el examen.** "Eliminar las credenciales root de todas las cuentas miembro y poder, aun así, desbloquear un bucket mal configurado" → **acceso root centralizado**: sin contraseña root, con **`sts:AssumeRoot`** para tareas puntuales.

## Datos verificados

**Credenciales:**
- Reduce el número de credenciales privilegiadas y dispositivos MFA que gestionar.
- Las cuentas creadas **después** de habilitar la función **no tienen contraseña root** ni pueden recuperarla hasta que vuelvas a habilitar la recuperación de cuenta.

**Sesiones root:**
- Duración **por defecto y máxima de 15 minutos**.
- Cada sesión queda limitada a su **política de tarea** (por ejemplo, `S3UnlockBucketPolicy`).
- Tareas soportadas: eliminar políticas de bucket de **S3** o de cola **SQS** que bloquean el acceso; y de credenciales root como crear un perfil de inicio de sesión root o auditar credenciales root.
- Se pueden restringir por red (las **SCP y las políticas de endpoint de VPC siguen aplicando** durante la sesión).
- Permisos acotados con la clave de condición **`sts:TaskPolicyArn`** en `sts:AssumeRoot`.
- Automatizables (EventBridge + Lambda) y trazables en **CloudTrail**.

**Requisitos y activación:**
- Iniciar sesión en la cuenta de administración con permisos de Organizations.
- El **root de la cuenta de administración debe seguir existiendo** (con credenciales conocidas y MFA).
- Entidades con permiso **`sts:AssumeRoot`** en la cuenta de administración o delegada.
- Habilitar: consola IAM → *Root access management* → *Enable* (también activa el acceso de confianza de IAM), o CLI:
  - `aws organizations enable-aws-service-access --service-principal iam.amazonaws.com`
  - registrar el administrador delegado
  - `aws iam enable-organizations-root-sessions` y `aws iam enable-organizations-root-credentials-management`

**Delegación:** AWS recomienda delegar en una **cuenta de seguridad dedicada** (la de Security Tooling), no en la de administración. Las sesiones root solo se inician desde la cuenta de administración o la delegada.

## Acceso de emergencia (break-glass)

> **Nota de verificación.** El diseño de *break-glass* es práctica general, no un punto contrastado en las páginas consultadas.

- Un **rol IAM de emergencia** con MFA físico, credenciales custodiadas fuera de línea, alertas ante cualquier uso y revisión posterior.
- El root de la **cuenta de administración** se protege con MFA (idealmente varias llaves FIDO2) y se usa solo si no hay otra opción.
- Alarmas: EventBridge/CloudWatch sobre inicios de sesión root y `AssumeRoot`.

## Patrones de examen

1. **Quitar el root como superficie de ataque en 200 cuentas** → gestión centralizada de credenciales root.
2. **Una bucket policy dejó el bucket inaccesible para todos** → sesión root con `S3UnlockBucketPolicy`.
3. **Quién puede ejecutar tareas root y cuáles** → permiso `sts:AssumeRoot` con `sts:TaskPolicyArn`.
4. **Auditar uso del root en la organización** → CloudTrail + alertas de EventBridge.
5. **Cuenta nueva sin contraseña root: ¿se puede recuperar?** → no hasta habilitar nuevamente la recuperación de cuenta.

## Referencias

- [Blog: proteger el acceso root de cuentas miembro](https://aws.amazon.com/blogs/security/secure-root-user-access-for-member-accounts-in-aws-organizations)
- [Centralizar el acceso root (IAM)](https://docs.aws.eu/IAM/latest/UserGuide/id_root-enable-root-access.html)
