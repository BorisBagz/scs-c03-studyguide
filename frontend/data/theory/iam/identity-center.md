## Qué es

**AWS IAM Identity Center** es el servicio recomendado para dar a la **fuerza laboral** (empleados, administradores) acceso con **inicio de sesión único (SSO)** a múltiples cuentas de AWS y a aplicaciones, con credenciales **temporales**. Reemplaza la creación de usuarios IAM individuales en cada cuenta.

> **En el examen.** "Acceso centralizado de empleados a muchas cuentas de la organización, con el IdP corporativo y sin usuarios IAM" → **IAM Identity Center**. Para **clientes finales de una aplicación** → Amazon Cognito (ver tema *Amazon Cognito*).

## Piezas principales

| Pieza | Qué es |
|---|---|
| **Instancia** | Se habilita en una región; por defecto vive en la **cuenta de administración** de AWS Organizations. |
| **Fuente de identidad** | Directorio propio de Identity Center, **Active Directory** (AWS Managed Microsoft AD o AD Connector) o **proveedor de identidad externo** (SAML 2.0, por ejemplo Okta o Microsoft Entra ID). |
| **Usuarios y grupos** | Provenientes de la fuente de identidad. Con un IdP externo se sincronizan por **SCIM** (aprovisionamiento automático). |
| **Permission set** | Plantilla de permisos (políticas administradas, políticas en línea, *permissions boundary*) que Identity Center materializa como **roles IAM** en cada cuenta asignada. |
| **Asignación** | Vincula un usuario o grupo con un permission set en una cuenta concreta. |
| **Portal de acceso** | Página donde el usuario elige cuenta y rol, o aplicaciones SAML/OAuth. |

Las sesiones son **credenciales temporales de STS**; la duración de la sesión se configura por permission set.

## Autenticación y MFA

- Con **IdP externo**, la autenticación y la MFA las impone el IdP.
- Con el directorio propio de Identity Center, se puede exigir MFA (aplicaciones autenticadoras, llaves de seguridad/FIDO2 y otros) y configurar cuándo se solicita.
- Acceso por CLI con `aws sso login`; los perfiles obtienen credenciales temporales sin claves de larga duración.

## Administración delegada

Por defecto la gestión se hace desde la cuenta de administración. Se puede **delegar** a una cuenta miembro para reducir el número de personas con acceso a esa cuenta (la **instancia sigue residiendo en la cuenta de administración**).

**Limitaciones y buenas prácticas** (según la documentación):

- El administrador delegado **no puede modificar** permission sets aprovisionados en la cuenta de administración; solo un administrador de Identity Center de esa cuenta puede hacerlo.
- Con Active Directory, el directorio debe estar en la cuenta del administrador delegado; si debe quedar en la cuenta de administración, la configuración se hace desde ella.
- **Asigna usuarios (no grupos) a permission sets de la cuenta de administración**: quien pueda cambiar la membresía de un grupo en la fuente de identidad podría concederse acceso a esa cuenta.
- Con fuente externa, el IdP es la fuente de verdad: bloquea con una **SCP** acciones como `identitystore:CreateGroupMembership`.
- **Restringe `sso-directory:CreateBearerToken`** (token SCIM) y permítelo solo al configurar o rotar el aprovisionamiento.
- Separa los permission sets de configuración (fuente de identidad, SCIM, sesiones) de los de gestión de asignaciones; usa etiquetas y condiciones para delegar por cuentas.

## Control de acceso basado en atributos

Identity Center puede pasar **atributos de usuario como etiquetas de sesión** (ABAC) para que una sola política conceda permisos según atributos como departamento o proyecto (ver tema *ABAC y RBAC*).

## Qué ver en el examen

| Escenario | Respuesta |
|---|---|
| Empleados inician sesión con el IdP corporativo y llegan a 50 cuentas | Identity Center + IdP externo + permission sets asignados a grupos |
| Aprovisionamiento automático de altas/bajas desde el IdP | **SCIM** |
| Evitar que muchos administradores usen la cuenta de administración | **Administración delegada** |
| Acceso por CLI sin claves de larga duración | `aws sso login` / perfiles de SSO |
| Alguien se retira de la empresa | Desactivar en el IdP → SCIM lo propaga; las sesiones activas vencen según la duración configurada |
| Límite máximo de permisos para un permission set | **Permissions boundary** en el permission set |

> **Nota de verificación.** Los detalles de fuentes de identidad, MFA y duración de sesión de esta sección son conocimiento general del servicio; la página oficial consultada cubrió solo la administración delegada.

## Referencias

- [Administración delegada en IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/delegated-admin.html)
