## Idea central

Las **políticas de control de servicios (SCP)** fijan el **máximo de permisos** disponibles para usuarios y roles IAM de las cuentas de una organización. Son barandillas: **nunca conceden permisos**.

> **En el examen.** Los permisos efectivos son la **intersección** de lo que permiten la SCP, la RCP, las políticas de identidad y las de recursos (y el *permissions boundary* o la session policy, si existen). Un `Deny` explícito en cualquiera prevalece. Un `AdministratorAccess` **no** supera una SCP que deniega.

## Qué afectan y qué no

| Las SCP **sí** afectan | Las SCP **no** afectan |
|---|---|
| Usuarios y roles de **cuentas miembro**, incluido el **usuario root** de la cuenta miembro | **Cuenta de administración** (usuarios y roles) |
| Cuentas miembro designadas como administradores delegados | **Roles vinculados a servicios** (service-linked roles) |
| | **Políticas de recursos** directamente, y principales de **fuera de la organización** |
| | Algunas tareas concretas (p. ej., registrar el plan Enterprise Support como root, firmante de confianza de CloudFront para contenido privado) |

Requisito: organización con **all features**.

## Lista de denegación vs. lista de permitidos

| | **Deny list** | **Allow list** |
|---|---|---|
| Cómo | Mantener `FullAWSAccess` y añadir `Deny` para lo prohibido | Quitar `FullAWSAccess` y permitir **explícitamente** solo lo necesario |
| Riesgo | Nuevos servicios quedan permitidos | Si quitas `FullAWSAccess` sin reemplazo, **todas las acciones fallan** en las cuentas miembro |
| Recomendación habitual | Más sencilla de operar | Más estricta, más mantenimiento |

`FullAWSAccess` se adjunta por defecto. Si deshabilitas el tipo de política en una raíz, **se desvinculan todas las SCP**; al reactivarlo la raíz solo tiene `FullAWSAccess` (las asociaciones previas se pierden).

## Límites (página de tipos de política)

- Tamaño máximo: **10 240 caracteres** por SCP.
- Hasta **10 SCP** adjuntas por raíz, OU o cuenta.
- Las SCP no tienen vista de "política efectiva" (a diferencia de las declarativas).

## Ejemplos de barandillas típicas

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "NoLeaveOrg", "Effect": "Deny", "Action": "organizations:LeaveOrganization", "Resource": "*" },
    { "Sid": "ProtegerCloudTrail", "Effect": "Deny",
      "Action": ["cloudtrail:StopLogging", "cloudtrail:DeleteTrail"], "Resource": "*" },
    { "Sid": "RegionesPermitidas", "Effect": "Deny", "NotAction": ["iam:*", "organizations:*", "sts:*", "support:*"],
      "Resource": "*",
      "Condition": { "StringNotEquals": { "aws:RequestedRegion": ["us-east-1", "us-west-2"] } } }
  ]
}
```

(Ilustrativo; los servicios globales hay que excluirlos con cuidado para el patrón de Regiones.)

Usos habituales: impedir salir de la organización, proteger CloudTrail/Config/GuardDuty, **limitar Regiones**, bloquear la creación de claves de acceso o el uso del root, exigir cifrado o `ec2:Encrypted`, impedir `kms:ScheduleKeyDeletion`.

## Buenas prácticas verificadas

- **Prueba antes de aplicar a la raíz:** crea una OU de prueba y mueve cuentas gradualmente.
- Usa los datos de **último acceso de servicios** de IAM para afinar hacia el mínimo privilegio.
- **No quites `FullAWSAccess`** sin reemplazo.
- Para quitar el riesgo de bloqueo total, deja una vía de emergencia (acceso root centralizado, ver tema).

## Diferencias con otras barreras

| | **SCP** | **Permissions boundary** | **Session policy** |
|---|---|---|---|
| Adjunta a | Raíz, OU, cuenta | Usuario o rol | Una sesión |
| Alcance | Todos los principales de la cuenta | Una identidad | Una sesión |

## Patrones de examen

1. **Impedir que cualquier cuenta deshabilite CloudTrail, incluso con Administrator** → SCP deny.
2. **Restringir Regiones en toda la organización** → SCP con `aws:RequestedRegion`.
3. **Un rol vinculado a servicio sigue funcionando pese a la SCP** → las SCP no lo afectan.
4. **La SCP no impide que la cuenta de administración haga X** → las SCP no afectan a esa cuenta.
5. **Todas las acciones fallan tras tocar SCP** → se quitó `FullAWSAccess` sin política de permitidos equivalente.
6. **Impedir acceso de principales externos a un bucket** → no es SCP (no afecta a externos): usa **RCP**.

## Referencias

- [Service control policies (SCPs)](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
- [Tipos de políticas de organización (límites)](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies.html)
