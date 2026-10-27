## Idea central

Para desplegar de forma **consistente y segura** en muchas cuentas, la infraestructura se define como código (IaC) y se **valida antes** de desplegar. Tres piezas que el examen distingue:

| Herramienta | Qué hace |
|---|---|
| **cfn-lint** | Inspección **estructural** de plantillas (sintaxis, propiedades válidas) |
| **CloudFormation Guard** | Evalúa datos JSON/YAML contra **tus reglas de política** (policy as code) |
| **CloudFormation Hooks** | **Aplica** reglas en el servidor antes de crear/actualizar/eliminar recursos |
| **StackSets** | Despliega una plantilla en **varias cuentas y Regiones** |

> **En el examen.** "Bloquear plantillas que crean recursos sin cifrado **antes** de desplegar" → reglas Guard aplicadas como **Hook** (o validación en el pipeline). "Desplegar la misma línea base en todas las cuentas y en las nuevas" → **StackSets** con permisos administrados por servicio y despliegue automático.

## CloudFormation Guard (verificado)

- Herramienta **open source** de policy-as-code con un DSL declarativo; valida JSON/YAML estructurado contra reglas y trae un marco de **pruebas unitarias** (`validate`, `test`).
- No se limita a CloudFormation: sirve para plantillas, *change sets*, Terraform en JSON, configuraciones de Kubernetes y **elementos de configuración de AWS Config**.
- Recomendación: reglas **simples** y reutilizables (referenciar reglas con nombre desde otras).
- **Guard escribe/evalúa; Hooks aplica.** Las reglas Guard pueden usarse para crear un Hook que se ejecuta en el servidor antes de operaciones de CloudFormation y de Cloud Control API; puede **bloquear o advertir**. Guard por sí solo no impone nada del lado del servidor.
- **No sustituye a cfn-lint**: Guard no valida la sintaxis ni los valores permitidos de propiedades.

Ejemplo ilustrativo de regla (no tomado de la página consultada):

```
rule s3_bucket_encrypted when resourceType == "AWS::S3::Bucket" {
    Properties.BucketEncryption exists
}
```

## Controles proactivos y detectivos

| Momento | Control |
|---|---|
| Antes de escribir/commit | cfn-lint, Guard en el IDE/pre-commit |
| En el pipeline (CI) | `cfn-guard validate` sobre plantillas y *change sets* |
| Al aprovisionar | **CloudFormation Hooks** / controles **proactivos** de Control Tower |
| Después de desplegar | **Config** (reglas detectivas), Security Hub |

Config no bloquea cambios no conformes; para impedirlos hay que usar políticas IAM/SCP o **Service Catalog**.

## CloudFormation StackSets

> **Nota de verificación.** La documentación de StackSets no se pudo consultar en esta sesión; el resumen sigue el funcionamiento general conocido.

| Aspecto | Detalle |
|---|---|
| **Modelo de permisos** | **Administrados por servicio** (con Organizations: despliega a OU y cuentas, y puede hacer **despliegue automático** a cuentas nuevas) o **autoadministrados** (roles IAM que creas tú) |
| **Alcance** | Cuentas y Regiones objetivo; operaciones con tolerancia a fallos y concurrencia |
| **Casos** | Habilitar Config/GuardDuty, roles de auditoría, línea base de logging en todas las cuentas |
| **Deriva** | Se puede detectar deriva de las instancias de stack |
| **Administrador delegado** | Se puede delegar StackSets a una cuenta miembro |

## Patrones de examen

1. **Verificar que ninguna plantilla permita buckets públicos antes del despliegue** → Guard en CI + Hook.
2. **Una plantilla tiene un tipo de recurso mal escrito** → cfn-lint (no Guard).
3. **Cada cuenta nueva debe recibir roles de seguridad automáticamente** → StackSets service-managed con despliegue automático.
4. **Config reporta incumplimiento pero ya está desplegado** → es detectivo; para prevenir usa Hooks/SCP.
5. **Validar recursos creados por Cloud Control API** → Hooks de Guard también cubren esa API.

## Referencias

- [Qué es CloudFormation Guard](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html)
- [Mejores prácticas de CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/best-practices.html)
