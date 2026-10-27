## Idea central

Saber **cómo AWS decide Allow o Deny** es la base de toda pregunta de autorización. La regla maestra: **por defecto todo se deniega (implicit deny)**; un `Allow` explícito puede abrir el acceso; un **`Deny` explícito siempre gana**.

> **En el examen.** Cuando haya varias políticas en juego, aplica este orden mental: ¿hay algún **Deny explícito** (en cualquier política)? → denegado. Si no, ¿algún límite (SCP, RCP, permissions boundary, session policy) **no permite** la acción? → denegado. Si no, ¿hay un **Allow** que la conceda? → permitido. Si nada la permite → **implicit deny**.

## Tipos de política y cómo se combinan

| Tipo | Rol | Combinación |
|---|---|---|
| **Basada en identidad** (usuario/grupo/rol) | Concede permisos al principal | Base de los permisos |
| **Basada en recursos** (bucket policy, trust policy, KMS key policy...) | Concede o niega a principales sobre el recurso | **Unión** con la de identidad (en la misma cuenta) |
| **Permissions boundary** | Máximo de permisos de un usuario/rol | **Intersección** con la de identidad |
| **SCP** (Organizations) | Máximo de permisos para **principales** de cuentas miembro | **Intersección** |
| **RCP** (Organizations) | Máximo de permisos sobre **recursos** de cuentas miembro | **Intersección** |
| **Session policy** | Limita una sesión (AssumeRole, federación) | **Intersección**; nunca concede |

Resumen de la documentación (misma cuenta):

| Capas | Cómo se combinan |
|---|---|
| Identidad + recurso | **Unión**: basta que una permita |
| Identidad + permissions boundary | **Intersección**: ambas deben permitir |
| Identidad + SCP + RCP | **Intersección**: todas deben permitir |
| Cualquier `Deny` explícito | **Anula** todos los `Allow` |

## Proceso de una solicitud

1. **Autenticación** del principal (algunos servicios, como S3, admiten solicitudes anónimas).
2. **Procesamiento del contexto de la solicitud:** AWS determina qué políticas aplican.
3. **Evaluación:** se consideran todos los tipos aplicables y se devuelve Allow o Deny.

## Detalles que el examen explota

| Concepto | Qué recordar |
|---|---|
| **Implicit deny** | Sin `Allow` explícito, se deniega. |
| **Explicit deny** | Gana a cualquier `Allow`, venga de donde venga. |
| **SCP/RCP** | **No conceden** permisos, solo fijan el techo; aun así, el principal necesita un `Allow` en su política. Las SCP no afectan a la cuenta de administración ni a roles vinculados a servicios. |
| **Permissions boundary** | No concede permisos por sí misma. Con boundary solo para S3/CloudWatch/EC2, una política que conceda `iam:CreateUser` no tiene efecto. |
| **Session policy** | Hasta 10 ARN administradas y/o una política en línea, máximo 2 048 caracteres en texto plano; la sesión resultante es la intersección. |
| **Recurso + boundary** | Para **usuarios IAM**, el implicit deny del boundary **no** limita las políticas de recursos de la misma cuenta; para **roles** sí las limita. Los deny explícitos siempre aplican. |
| **`NotPrincipal` con Deny** | Deniega siempre a los principales con boundary; usa mejor `ArnNotEquals` con `aws:PrincipalArn`. |

(Los detalles de recurso + boundary y session policies provienen de la página de permissions boundaries y de la API de `AssumeRole`; la página de evaluación consultada cubre solo el caso de una cuenta.)

## Acceso entre cuentas

La documentación general indica que, entre cuentas, la solicitud debe estar permitida **en ambas**: la política de **identidad** del principal en su cuenta **y** la política de **recurso** de la cuenta propietaria (o un rol asumido en la cuenta destino). Un rol que se asume cambia el contexto: el principal pasa a ser la sesión del rol (ver tema *Políticas de recursos y confianza*).

> **Nota de verificación.** La página oficial de lógica de evaluación recuperada no incluyó las reglas entre cuentas, implicit deny en detalle ni session policies; esas partes se completaron con otras páginas oficiales y conocimiento general.

## Herramientas para razonar sobre permisos

- **IAM Policy Simulator:** prueba políticas (incluidos boundaries y, con Organizations, SCP) contra acciones y recursos sin ejecutarlas.
- **Access Analyzer** (ver tema): validación, generación y revisiones personalizadas.
- **CloudTrail:** el motivo de un `AccessDenied` (en mensajes recientes se indica el tipo de política que denegó, por ejemplo SCP o identidad; confirma el formato en la guía).

## Patrones de examen

1. **Un usuario tiene `s3:*` pero recibe AccessDenied** → buscar deny explícito, SCP/RCP, boundary o session policy que no permitan la acción; o una bucket policy con `Deny`.
2. **El administrador de una cuenta miembro no puede crear un recurso permitido en su política** → SCP lo bloquea.
3. **Limitar a desarrolladores que crean roles** → permissions boundary exigida mediante `iam:PermissionsBoundary` en su política.
4. **Un rol necesita menos permisos solo para esta tarea** → session policy en `AssumeRole`.
5. **Permitir solo con MFA o desde ciertas redes** → `Deny` con condición negada (las condiciones de `Deny` ganan).

## Referencias

- [Lógica de evaluación de políticas](https://docs.aws.amazon.com/IAM/latest/UserGuide/AccessPolicyLanguage_EvaluationLogic.html)
- [Permissions boundaries](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html)
- [`AssumeRole` (session policies)](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)
