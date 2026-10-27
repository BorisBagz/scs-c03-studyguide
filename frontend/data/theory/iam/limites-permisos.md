## Idea central

Tres mecanismos **limitan** permisos sin concederlos: **permissions boundaries** (techo de un usuario o rol), **session policies** (techo de una sesión) y **SCP/RCP** (techo de una cuenta u organización, ver Dominio 6). Todos actúan por **intersección** con la política de identidad: el permiso efectivo es lo que **todas** las capas permiten, y un `Deny` explícito en cualquiera prevalece.

| | **Permissions boundary** | **Session policy** | **SCP** |
|---|---|---|---|
| Se adjunta a | Usuario o rol IAM | Una sesión (al asumir un rol o federar) | Raíz, OU o cuenta de Organizations |
| Duración | Permanente | Solo esa sesión | Permanente |
| Concede permisos | **No** | **No** | **No** |
| Típico uso | Delegar la creación de roles/usuarios sin escalada de privilegios | Reducir permisos puntuales de un rol | Barandillas a nivel de organización |

## Permissions boundary

Es una **política administrada** adjunta a un usuario o rol que fija sus **permisos máximos**. La entidad solo puede hacer una acción si **tanto** su política de identidad **como** su boundary la permiten.

- **No concede** nada por sí sola. Ejemplo oficial: un boundary que solo permite `s3:*`, `cloudwatch:*` y `ec2:*`, y una política de identidad que concede `iam:CreateUser` → la acción **falla** porque el boundary no incluye IAM.
- Se aplica a **usuarios y roles** (no a grupos).

### Interacción con otras políticas

| Con... | Efecto |
|---|---|
| **Identidad** | Intersección; un deny explícito en cualquiera anula los allow |
| **Recursos (misma cuenta)** | Para **usuarios IAM**, el implicit deny del boundary **no** limita las políticas de recursos; para **roles**, sí. Para sesiones de rol o federadas cuyo ARN se nombra en la política de recursos, el boundary no las limita. Los deny explícitos aplican siempre |
| **SCP** | La solicitud debe estar permitida por SCP, boundary e identidad |
| **Session policy** | Permisos de sesión = intersección de session policy, boundary e identidad |

**Aviso oficial:** evita políticas de recursos con `NotPrincipal` + `Deny`; siempre deniegan a los principales con boundary. Usa `ArnNotEquals` con `aws:PrincipalArn`.

### Delegar administración sin escalada de privilegios

Ejemplo oficial (con usuarios; el mismo patrón vale para roles). Una administradora delega a Zhang la gestión de usuarios con tres políticas:

1. **`XCompanyBoundaries`:** el boundary que deben llevar todos los usuarios nuevos (por ejemplo, S3, CloudWatch, EC2 y DynamoDB, con denegaciones explícitas a recursos críticos).
2. **`DelegatedUserBoundary`:** el boundary del propio Zhang. Solo le permite crear usuarios si se les adjunta `XCompanyBoundaries`, con la condición:

```json
"Condition": {
  "StringEquals": {
    "iam:PermissionsBoundary": "arn:aws:iam::123456789012:policy/XCompanyBoundaries"
  }
}
```

   Además **deniega** editar las políticas de boundary y quitar boundaries.
3. **`DelegatedUserPermissions`:** concede `iam:*` y algunas acciones de CloudWatch y S3; el boundary de Zhang recorta lo que de verdad puede hacer.

Resultado: los usuarios que crea Zhang **no pueden exceder** los límites. Precaución oficial: delegar IAM puede conceder indirectamente acceso a servicios que el boundary excluye, así que el diseño de la delegación debe cuidarse.

> **En el examen.** "Los desarrolladores pueden crear roles para sus aplicaciones pero no deben poder darse más permisos que los suyos" → **permissions boundary exigida por la condición `iam:PermissionsBoundary`** en el permiso `iam:CreateRole`/`AttachRolePolicy`, y denegar la eliminación del boundary.

## Session policies

Se pasan al llamar `AssumeRole`, `AssumeRoleWithSAML`, `AssumeRoleWithWebIdentity` o `GetFederationToken`.

- Una política en línea (`Policy`) y/o hasta **10** ARN de políticas administradas (`PolicyArns`); juntas, máximo **2 048 caracteres** de texto plano.
- Permisos efectivos = **intersección** entre la política de identidad del rol y las session policies; **nunca** amplían.
- Son el mecanismo para que una aplicación, al asumir un rol, pase a cada usuario solo lo que necesita (por ejemplo, un broker de acceso a S3 con un prefijo por usuario).
- Impactan el tamaño del token de sesión (máx. 4 096 bytes junto con las etiquetas).

## Cuándo usar cada mecanismo

| Necesidad | Mecanismo |
|---|---|
| Techo permanente para usuarios/roles creados por un equipo delegado | **Permissions boundary** |
| Reducir lo que puede hacer una sesión concreta de un rol compartido | **Session policy** |
| Barandilla para todas las cuentas o una OU | **SCP** (principales) / **RCP** (recursos) |
| Evitar que cualquiera suba el boundary o lo quite | Deny explícito sobre `DeleteUserPermissionsBoundary`/`DeleteRolePermissionsBoundary` y sobre la edición de la política |

## Patrones de examen

1. **Delegar creación de roles de aplicación sin riesgo de escalada** → boundary obligatoria + condición `iam:PermissionsBoundary`.
2. **El rol tiene `AdministratorAccess` pero la sesión solo debe leer un prefijo de S3** → session policy.
3. **Un usuario con boundary no puede usar `iam:CreateUser` aunque su política lo conceda** → el boundary no incluye IAM.
4. **Aplicar a todas las cuentas "nunca desactivar CloudTrail"** → SCP (no boundary).
5. **Política de recursos con NotPrincipal bloquea a todos los roles con boundary** → reemplazar por `ArnNotEquals` con `aws:PrincipalArn`.

## Referencias

- [Permissions boundaries para entidades IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html)
- [`AssumeRole`: session policies](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)
- [Lógica de evaluación de políticas](https://docs.aws.amazon.com/IAM/latest/UserGuide/AccessPolicyLanguage_EvaluationLogic.html)
