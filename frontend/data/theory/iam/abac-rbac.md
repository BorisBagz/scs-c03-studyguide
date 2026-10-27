## Idea central

Hay dos grandes estrategias de autorización en IAM:

| | **RBAC** (por roles) | **ABAC** (por atributos) |
|---|---|---|
| Base | Permisos agrupados por función en roles/grupos | **Etiquetas** (atributos) en principales y recursos |
| Al crecer | Hay que crear roles/políticas nuevas o editar los ARN de recursos | La **misma política** sirve; basta etiquetar |
| Granularidad | Gruesa (por rol) | Fina (por proyecto, equipo, centro de costos...) |

> **En el examen.** "Escalar permisos a muchos proyectos sin editar políticas cada vez que se añade un recurso o persona" → **ABAC con etiquetas**.

## ABAC en AWS

ABAC define permisos con **etiquetas**, que pueden estar en entidades IAM (usuarios, roles) y en recursos de AWS. Una política concede acceso cuando las etiquetas del principal **coinciden** con las del recurso. Es más flexible que listar cada recurso, y el acceso crece con menos cambios en las políticas.

### Claves de condición

| Clave | Qué compara |
|---|---|
| **`aws:PrincipalTag/clave`** | Etiqueta del **principal** (usuario, rol o **sesión**) |
| **`aws:ResourceTag/clave`** | Etiqueta del **recurso** al que se accede |
| **`aws:RequestTag/clave`** | Etiqueta que se **envía en la solicitud** (p. ej., al crear o etiquetar) |
| **`aws:TagKeys`** | Lista de claves de etiqueta en la solicitud (se usa con `ForAllValues`/`ForAnyValue`) |
| `iam:ResourceTag/clave` | Etiqueta de un recurso IAM (p. ej., un rol que se quiere asumir) |

Las claves por servicio (por ejemplo `secretsmanager:ResourceTag/...`) existen para algunos recursos; **no todos los servicios y acciones** soportan autorización por etiquetas. Consulta "AWS services that work with IAM" y "Actions, Resources, and Condition Keys" del servicio.

### Patrón del tutorial oficial (ejemplo con Secrets Manager)

Una sola política adjunta a todos los roles permite todas las acciones **solo cuando** `aws:ResourceTag/...` coincide con `${aws:PrincipalTag/...}` para proyecto, equipo y centro de costos. Elementos clave:

1. **Coincidencia de etiquetas** en el recurso con las del principal.
2. **`ForAllValues:StringEquals` sobre `aws:TagKeys`** para que en la solicitud solo viajen claves de etiqueta permitidas.
3. **`StringEqualsIfExists` sobre `aws:RequestTag/...`**: al crear un recurso, las etiquetas deben coincidir con las del principal (así el creador luego puede verlo).
4. **Statements aparte** para acciones que no soportan etiquetas de recurso (por ejemplo `ListSecrets`, `GetRandomPassword`).
5. **Deny para proteger las etiquetas**: impedir `UntagResource` de las claves reservadas (`access-*`) y denegar la gestión de políticas de recursos, porque quitar etiquetas equivale a quitar permisos.
6. **Asumir roles por etiquetas:** `sts:AssumeRole` condicionado a que `iam:ResourceTag/...` del rol coincida con `${aws:PrincipalTag/...}` del usuario.

Advertencias oficiales: IAM **no admite etiquetas multivaluadas** en sesión (STS exige un solo valor por etiqueta); si un usuario trabaja en dos proyectos, hay que listar los dos roles explícitamente. Un `AdministratorAccess` adjunto **anula** los límites del ABAC. Y la regla general: usa `Deny` explícito solo cuando no exista ninguna circunstancia que deba permitir esa acción.

### Etiquetas de sesión (federación)

Con **SAML/OIDC**, el IdP puede enviar atributos como **session tags**; al federarse, los atributos del empleado se aplican al principal resultante y se evalúan con `aws:PrincipalTag`. Con `AssumeRole`, las etiquetas pasan con `Tags` y, para encadenamiento, con `TransitiveTagKeys`. **IAM Identity Center** también soporta ABAC con atributos de usuario.

### Gobierno de etiquetas: el punto débil de ABAC

Si cualquiera puede **modificar etiquetas**, puede concederse acceso. Controles:

- Restringir quién puede ejecutar `TagResource`, `UntagResource` y `iam:TagUser/TagRole` y sobre qué claves (con `aws:TagKeys`, `aws:RequestTag`).
- **SCP** que impidan modificar las etiquetas de control de acceso salvo desde roles de administración.
- **Tag policies** de Organizations para estandarizar claves y valores (Dominio 6).
- **Config** para detectar recursos sin las etiquetas requeridas.

## Rutas y RBAC bien hecho

- Agrupar permisos en roles por función; asignar con grupos de IdP o de Identity Center.
- Usar **rutas** (`/dev/`, `/prod/`) para delegar con comodines.
- Combinar con permission boundaries para evitar escalada de privilegios.

## Patrones de examen

1. **Cada equipo solo gestiona los recursos de su proyecto** → ABAC con `aws:PrincipalTag` = `aws:ResourceTag`.
2. **Los recursos nuevos deben nacer con las etiquetas del creador** → `aws:RequestTag` con `...IfExists` y `ForAllValues` en `aws:TagKeys`.
3. **Impedir que un desarrollador se auto-conceda acceso cambiando etiquetas** → denegar `UntagResource`/`TagResource` sobre claves de control + SCP.
4. **Atributos del directorio corporativo controlan acceso en AWS** → session tags desde SAML/OIDC o Identity Center.
5. **Usuario en dos proyectos con ABAC** → no hay etiquetas multivaluadas; listar explícitamente los roles permitidos.

## Referencias

- [Tutorial IAM: permisos basados en etiquetas (ABAC)](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_attribute-based-access-control.html)
- [`AssumeRole`: session tags y etiquetas transitivas](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)
