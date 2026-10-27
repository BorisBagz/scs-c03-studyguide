## Idea central

La autenticación fuerte se apoya en tres decisiones: **MFA resistente al phishing**, **credenciales temporales en lugar de claves de larga duración** y **auditoría continua** de las credenciales existentes. Este tema cubre la MFA en IAM, el usuario raíz y las herramientas de auditoría.

## Tipos de MFA en IAM

| Tipo | Detalle |
|---|---|
| **Passkeys y llaves de seguridad (FIDO)** | **Recomendado.** Resistentes al phishing (criptografía de clave pública). *Security keys* físicas (YubiKey) o *passkeys* sincronizadas desde gestores de credenciales (Google, Apple, Microsoft, 1Password, Bitwarden...). Una llave física puede servir a varios usuarios (raíz e IAM). |
| **Aplicación autenticadora virtual** | TOTP (RFC 6238) en el teléfono. Se recomienda como medida intermedia mientras llegan passkeys o hardware. Cada token es único para un usuario. |
| **Token TOTP de hardware** | Genera códigos de seis dígitos; solo funciona con semillas aprovisionadas por AWS. |
| **SMS** | **Ya no se admite.** Quien lo usaba debe migrar a otro tipo. |

**Cantidad:** el usuario raíz y cada usuario IAM pueden registrar hasta **ocho dispositivos MFA**, de cualquier tipo admitido; basta uno para iniciar sesión. Para agregar o quitar un dispositivo, el usuario debe autenticarse con uno existente.

**Limitaciones:** passkeys y llaves de seguridad solo se activan desde la **consola** (no por CLI/API) y su información de MFA no puede pasarse a operaciones de STS; para credenciales de CLI/SDK se usa `aws login`.

> **En el examen.** "MFA resistente al phishing" → passkey o llave de seguridad FIDO, no TOTP ni SMS. "Perdí el dispositivo MFA del root" → usar otro dispositivo registrado (por eso se registran varios) para evitar el procedimiento de recuperación de cuenta.

## Usuario raíz

- **MFA obligatoria** para el usuario raíz en todos los tipos de cuenta (independiente, de administración y miembro).
- Activarla afecta solo a las credenciales raíz; los usuarios IAM tienen identidades y MFA separadas.
- Registrar varios dispositivos y guardar los de respaldo en un lugar seguro.
- Para cuentas de una organización, la gestión centralizada del acceso raíz (ver Dominio 6) evita mantener credenciales raíz en cada cuenta miembro.

## Exigir MFA con políticas

Dos claves de condición (comportamiento general de IAM; no estaban en la página consultada):

| Clave | Significado |
|---|---|
| `aws:MultiFactorAuthPresent` | Booleana; `true` si las credenciales temporales se crearon con MFA. **No existe** en claves de acceso de larga duración. |
| `aws:MultiFactorAuthAge` | Segundos desde la verificación MFA; ausente en credenciales de larga duración. |

**Patrón clásico:** permitir solo la autogestión de MFA y **denegar todo lo demás** si no hay MFA, usando `Deny` + `NotAction` + `BoolIfExists: aws:MultiFactorAuthPresent = false`. El `BoolIfExists` es esencial: con claves de larga duración la clave no existe y, sin `IfExists`, la condición no coincidiría. Añade `aws:MultiFactorAuthAge` para reautenticación en una ventana de tiempo.

Para exigir MFA al **asumir un rol**: condición `aws:MultiFactorAuthPresent` en la trust policy (ver tema *STS y federación*).

## Credenciales de larga duración: reducirlas

1. **Humanos:** acceso por Identity Center o federación (credenciales temporales), no usuarios IAM con claves.
2. **Cargas en AWS:** roles (instance profile, execution role).
3. **Cargas fuera de AWS:** IAM Roles Anywhere u OIDC.
4. Si deben existir claves: rotarlas, usar una sola activa, monitorear su uso y eliminarlas cuando no se usen.

## Auditoría de credenciales

### Credential report

CSV con todos los usuarios IAM **y el raíz** y el estado de sus credenciales.

| Categoría | Columnas ejemplo |
|---|---|
| Contraseña | `password_enabled`, `password_last_used`, `password_last_changed` |
| MFA | `mfa_active` |
| Claves de acceso (hasta 2) | `access_key_N_active`, `..._last_rotated`, `..._last_used_date`, `..._last_used_service` |

- Se puede generar **una vez cada cuatro horas**; AWS conserva **un reporte por cuenta** (el nuevo sobrescribe el anterior).
- Permisos: `iam:GenerateCredentialReport` y `iam:GetCredentialReport`.
- **Usos:** credenciales no usadas, usuarios con contraseña pero sin MFA (`password_enabled = TRUE` y `mfa_active = FALSE`), antigüedad de claves, usuarios con dos claves activas (rotación incompleta).
- **Limitaciones:** excluye credenciales específicas de servicio (CodeCommit, claves API de Bedrock y de CloudWatch Logs); solo detalla las dos primeras claves por usuario (usa `ListAccessKeys` para el resto); el último uso se registra de forma espaciada (5 min para contraseñas, 15 min para claves).

### Otras fuentes

- **IAM Access Analyzer – unused access:** roles, claves y contraseñas sin uso (ver tema *Access Analyzer*).
- **Último acceso (access advisor):** cuándo se usó cada servicio por rol/usuario.
- **AWS Config / Security Hub:** reglas para MFA en usuarios IAM y en el raíz, claves antiguas o sin rotar.
- **CloudTrail + EventBridge:** alertar de inicios de sesión raíz o sin MFA.

## Patrones de examen

1. **Todos los usuarios deben usar MFA para cualquier acción** → política `Deny` con `NotAction` y `BoolIfExists` de MFA.
2. **Auditar usuarios con consola pero sin MFA** → credential report.
3. **Eliminar claves de acceso sin uso** → credential report / Access Analyzer (unused access) + automatizar con Config.
4. **MFA más fuerte para administradores** → llaves FIDO2; en Identity Center, MFA del IdP.
5. **Alertar cuando alguien use el usuario raíz** → regla de EventBridge sobre `ConsoleLogin` raíz en CloudTrail.

## Referencias

- [MFA en IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/Using_ManagingMFA.html)
- [Credential reports](https://docs.aws.amazon.com/IAM/latest/UserGuide/credential-reports.html)
