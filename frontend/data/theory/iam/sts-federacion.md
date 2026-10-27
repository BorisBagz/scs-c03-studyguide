## Idea central

**AWS STS (Security Token Service)** emite **credenciales temporales** (access key ID, secret y session token). Casi toda la autenticación segura en AWS —roles de instancia, federación, Identity Center, cross-account— termina en una llamada a STS. El examen espera que sepas **qué operación usar en cada escenario** y qué controles añadir (External ID, MFA, session tags, SourceIdentity).

## Operaciones de STS

| Operación | Quién la llama | Escenario |
|---|---|---|
| **`AssumeRole`** | Usuario/rol IAM (con credenciales AWS) | Dentro de una cuenta o **entre cuentas**; encadenamiento de roles |
| **`AssumeRoleWithSAML`** | Usuario federado con una aserción SAML 2.0 | Federación con IdP corporativo (SAML) |
| **`AssumeRoleWithWebIdentity`** | App con un token OIDC (Google, Cognito, EKS/IRSA...) | Identidades web / OIDC |
| **`GetSessionToken`** | Usuario IAM | Obtener credenciales temporales **con MFA** para un usuario |
| **`GetFederationToken`** | Usuario IAM | Federación personalizada (broker propio) con permisos acotados por política |

## `AssumeRole` en detalle

**Quién puede llamarlo**

- **Misma cuenta:** una política de identidad que permita `sts:AssumeRole` sobre el rol, **o** que la *trust policy* del rol nombre directamente al principal (la trust policy es una política de recursos).
- **Entre cuentas:** la *trust policy* del rol debe confiar en la cuenta del llamador **y** el administrador de esa cuenta debe conceder `sts:AssumeRole` sobre el ARN del rol.

**Duración**

- `DurationSeconds`: de **900 s (15 min) a 43 200 s (12 h)**, por defecto **3 600 s**; no puede exceder la duración máxima de sesión configurada en el rol.
- **Encadenamiento de roles** (un rol asumido que asume otro): la sesión queda limitada a **1 hora**; pedir más provoca error.

**Controles de seguridad en el asumir**

| Control | Función |
|---|---|
| **External ID** (`sts:ExternalId`) | Cadena que el tercero incluye en cada llamada; impide el problema del *confused deputy* con proveedores externos. Longitud 2–1 224 caracteres. |
| **MFA** | Parámetros `SerialNumber` y `TokenCode`; la trust policy exige `"Bool": {"aws:MultiFactorAuthPresent": true}`. Sin MFA válida: acceso denegado. |
| **Session policy** | Política en línea (`Policy`) y/o hasta 10 ARN de políticas administradas (`PolicyArns`) que **restringen** la sesión. Permisos efectivos = **intersección** entre la política del rol y la de la sesión; **nunca** amplían permisos. |
| **Session tags** | Hasta 50 pares clave-valor (`Tags`) que viajan en la sesión para **ABAC**; una etiqueta de sesión **sobrescribe** una del rol con la misma clave. Requiere `sts:TagSession`. |
| **Transitive tags** (`TransitiveTagKeys`) | Etiquetas que se heredan en sesiones encadenadas; las que no se marcan transitivas no pasan. |
| **SourceIdentity** | Identidad fijada por quien llama; **persiste** por toda la cadena de roles, aparece en **CloudTrail** y se puede exigir con `sts:SourceIdentity` en la trust policy. Útil para atribuir acciones al usuario humano real. |

**Límites a recordar:** el token de sesión (política de sesión + etiquetas) tiene un máximo de **4 096 bytes**; si se excede, error `PackedPolicyTooLarge`. Las credenciales de `AssumeRole` **no** pueden llamar a `GetSessionToken` ni `GetFederationToken`.

## Federación SAML 2.0

1. El usuario se autentica en el **IdP corporativo** (ADFS, Okta, Entra ID).
2. El IdP emite una **aserción SAML** con el rol (y atributos).
3. El navegador la presenta al endpoint de inicio de sesión de AWS (o el cliente llama a `AssumeRoleWithSAML`).
4. AWS devuelve credenciales temporales o una URL de consola.

Requiere un **proveedor de identidad SAML** en IAM y una *trust policy* del rol que confíe en él. Los atributos de la aserción pueden pasar como **session tags** (ABAC). Para muchas cuentas, la solución moderna es **IAM Identity Center** (ver tema).

## Identidades web / OIDC

- Proveedor OIDC registrado en IAM (por ejemplo, el emisor de un clúster EKS o GitHub Actions) y rol cuya trust policy confía en él con condiciones sobre `aud` y `sub`.
- Evita claves de larga duración en pipelines: el pipeline presenta su token OIDC y asume el rol.
- **Amazon Cognito identity pools** hacen esto por ti para usuarios de aplicaciones.

## Credenciales temporales vs permanentes

| | **Temporales (STS)** | **Claves de acceso de usuario IAM** |
|---|---|---|
| Duración | Minutos a 12 h | Hasta que se roten o eliminen |
| Rotación | Automática | Manual |
| Riesgo si se filtran | Acotado en el tiempo | Alto |
| Recomendación | **Preferir siempre** | Evitar; si es inevitable, rotar y monitorear |

## Revocar sesiones activas

Las credenciales temporales no se pueden "eliminar"; si se comprometen:

- Aplica una política que **deniegue** todo con condición `aws:TokenIssueTime` anterior a un instante dado (en la consola, "Revoke active sessions" lo hace por ti).
- Elimina o corrige permisos del rol.
- Para raíces de confianza: elimina el IdP o cambia la *trust policy*.

## Patrones de examen

1. **Cuenta de un proveedor SaaS asume un rol en tu cuenta** → trust policy con **External ID**.
2. **Rol de administración exige MFA para asumirlo** → condición `aws:MultiFactorAuthPresent`.
3. **Atribuir acciones a un humano aunque se encadenen roles** → **SourceIdentity**.
4. **Reducir los permisos de una sesión puntual sin crear otro rol** → **session policy**.
5. **Pipeline de CI/CD sin claves de larga duración** → proveedor OIDC + `AssumeRoleWithWebIdentity`.
6. **Credenciales de rol comprometidas** → denegación por `aws:TokenIssueTime` + corregir trust/permisos.
7. **Sesión encadenada que falla con 2 horas** → límite de 1 hora en role chaining.

## Referencias

- [`AssumeRole` (API de STS)](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)
- [El problema del confused deputy](https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html)
- [Tutorial ABAC con etiquetas](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_attribute-based-access-control.html)
