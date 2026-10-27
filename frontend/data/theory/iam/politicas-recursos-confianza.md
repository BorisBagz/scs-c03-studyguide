## Idea central

Además de las políticas de identidad, el acceso se controla **desde el recurso** (políticas de recursos) y **desde la relación de confianza** de un rol (trust policy). Dominar ambas es la clave del acceso entre cuentas y de la defensa contra el *confused deputy*.

## Políticas basadas en recursos

Adjuntas a un recurso (bucket de S3, cola SQS, tema SNS, clave KMS, secreto, función Lambda, repositorio ECR...). Incluyen el elemento **`Principal`**, que identifica quién recibe el permiso.

| Aspecto | Detalle |
|---|---|
| **Misma cuenta** | Se combinan en **unión** con las políticas de identidad: basta que una permita (salvo deny explícito). |
| **Entre cuentas** | Debe permitir **la política del recurso y la identidad del principal** (o usar un rol asumido en la cuenta del recurso). |
| **Principal** | Cuentas, usuarios, roles, sesiones de rol, servicios AWS (`servicio.amazonaws.com`), `*`. Evita `"Principal": "*"` sin condiciones. |
| **Condiciones útiles** | `aws:PrincipalOrgID`, `aws:PrincipalOrgPaths`, `aws:SourceArn`, `aws:SourceAccount`, `aws:SourceVpce`, `aws:SourceIp`, `aws:PrincipalArn`. |

> **En el examen.** "Permitir a todas las cuentas de mi organización, presentes y futuras, leer un bucket" → `Principal: "*"` **con condición `aws:PrincipalOrgID`** (no listar cuentas una por una).

**Caso especial — KMS:** una clave **siempre** requiere su *key policy*; sin ella, las políticas de identidad no bastan (se profundiza en el Dominio 5).

## Trust policies (políticas de confianza de un rol)

Es la política de recursos **del rol**: define **quién puede asumirlo** (`sts:AssumeRole` y variantes). Los permisos del rol están en sus políticas de identidad; la trust policy solo decide quién entra.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::222222222222:root" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "sts:ExternalId": "valor-unico-por-cliente" },
      "Bool": { "aws:MultiFactorAuthPresent": "true" }
    }
  }]
}
```

- Si la trust policy nombra **directamente** al principal, en la misma cuenta no se necesita una política de identidad adicional; entre cuentas, **sí** hace falta que la cuenta del llamador conceda `sts:AssumeRole`.
- Poner `:root` de una cuenta significa "cualquier principal de esa cuenta al que su administrador conceda `sts:AssumeRole`", no solo el usuario raíz.
- Condiciones típicas: `sts:ExternalId`, `aws:MultiFactorAuthPresent`, `sts:SourceIdentity`, `aws:PrincipalOrgID`, etiquetas de sesión (`aws:RequestTag`, `aws:PrincipalTag`).

## Acceso entre cuentas: dos modelos

| Modelo | Cómo funciona | Comentario |
|---|---|---|
| **Rol asumido** | El principal asume un rol en la cuenta destino y actúa con **esa identidad** | Cede las credenciales y permisos de origen; útil para auditar por rol y aplicar SCP de la cuenta destino |
| **Política de recurso** | El principal accede directamente al recurso con su propia identidad | Conserva la identidad original; no todos los servicios lo soportan |

## Confused deputy

Problema en que una entidad **sin** permiso consigue que otra con más privilegios actúe por ella.

| Escenario | Mitigación |
|---|---|
| **Entre cuentas** (un tercero asume un rol en tu cuenta) | Condición **`sts:ExternalId`** en la trust policy; el tercero genera un ID **único por cliente** y lo envía en cada `AssumeRole`. |
| **Entre servicios** (un servicio AWS accede a tu recurso en nombre de otro cliente) | Condiciones **`aws:SourceArn`** (recurso concreto), **`aws:SourceAccount`** (cuenta), **`aws:SourceOrgID`** y **`aws:SourceOrgPaths`** (organización) en la política del recurso o la trust policy. |

La documentación recomienda estas claves **siempre que concedas acceso a un principal de servicio**. Ejemplos oficiales: CloudTrail → S3 con `aws:SourceAccount`; AppStream → S3 con `aws:SourceArn` del fleet. Una **RCP** puede imponer `aws:SourceOrgID` de forma central (deniega `s3:*` cuando el origen no es tu organización) sin editar cada política de recurso.

> **En el examen.** "Un proveedor SaaS asume un rol en tu cuenta; ¿cómo evitas que otro cliente del proveedor use tu rol?" → **External ID**. "SNS/S3/CloudTrail escriben en tu recurso; ¿cómo aseguras que solo actúen por tu recurso/cuenta?" → **`aws:SourceArn` / `aws:SourceAccount`**.

## Rutas (paths) de IAM

Los nombres de usuarios, grupos, roles y políticas pueden llevar una **ruta** (`/finanzas/`, `/dev/`). Sirven para **organizar** y para escribir políticas por ruta (por ejemplo, `Resource: arn:aws:iam::123456789012:role/dev/*`). No son un control de seguridad por sí mismas, pero permiten delegar con comodines.

## Patrones de examen

1. **Cuentas de toda la organización acceden a un bucket** → `aws:PrincipalOrgID` en la bucket policy.
2. **Proveedor externo con acceso a tu cuenta** → rol + `ExternalId`.
3. **Servicio escribe logs a tu bucket** → bucket policy con principal de servicio + `aws:SourceArn`/`SourceAccount`.
4. **Un rol solo debe poder asumirse desde la organización** → `aws:PrincipalOrgID` en la trust policy.
5. **Delegar gestión de roles de un departamento** → rutas + permissions boundary.
6. **Un recurso no debe ser asumible por cuentas ajenas aunque su política lo abra** → RCP / SCP preventiva.

## Referencias

- [El problema del confused deputy](https://docs.aws.eu/IAM/latest/UserGuide/confused-deputy.html)
- [`AssumeRole` (API de STS)](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)
- [Lógica de evaluación de políticas](https://docs.aws.amazon.com/IAM/latest/UserGuide/AccessPolicyLanguage_EvaluationLogic.html)
