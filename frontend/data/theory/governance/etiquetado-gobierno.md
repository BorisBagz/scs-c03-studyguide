## Idea central

Las etiquetas (tags) sirven para costos, operación y, sobre todo en seguridad, para **control de acceso (ABAC)**, automatización y reglas de cumplimiento. En gobierno se combinan tres controles:

| Control | Qué logra | Qué **no** logra |
|---|---|---|
| **Tag policies** | Estandarizar **claves y valores permitidos**; informe de cumplimiento; opcionalmente bloquear valores no conformes en los tipos de recurso seleccionados | **No exigen que la etiqueta exista** |
| **SCP** | Exigir la **presencia** de etiquetas al crear (`Null` sobre `aws:RequestTag/...`) y bloquear su eliminación | Solo cubre las acciones que listes |
| **AWS Config** | Detectar recursos sin etiquetas requeridas (regla `required-tags`) | No bloquea |

> **En el examen.** "Exigir que todo recurso nuevo lleve la etiqueta `CostCenter` con valores válidos" → **SCP (presencia) + tag policy (valores)**. Una tag policy por sí sola no obliga a poner la etiqueta.

## Tag policies (verificado)

- "Solo hacen cumplir el valor aceptado de una etiqueta, **no su presencia**".
- La aplicación es opcional: marcas "prevenir operaciones no conformes" y eliges los **tipos de recurso** (campo `enforced_for`, p. ej. `ec2:instance`).
- Cumplimiento visible en **Resource Groups → Tagging → Tag policies**.
- La enforcement solo aplica a los tipos de recurso soportados y seleccionados.
- Sin costo adicional.

## SCP para exigir etiquetas (verificado)

El patrón del blog de AWS:

- **Deny** `ec2:RunInstances` cuando `aws:RequestTag/costcenter` o `aws:RequestTag/team` son nulos (ausentes), para ARN de instancias y volúmenes.
- **Deny** `ec2:DeleteTags` sobre esas claves para que no se puedan quitar.
- Las SCP cubren **solo las acciones listadas**; para otros servicios se repite el patrón o se combina en una sola política si se alcanza el límite.

```json
{
  "Effect": "Deny",
  "Action": "ec2:RunInstances",
  "Resource": ["arn:aws:ec2:*:*:instance/*", "arn:aws:ec2:*:*:volume/*"],
  "Condition": { "Null": { "aws:RequestTag/costcenter": "true" } }
}
```

## Etiquetas y seguridad

- **ABAC:** `aws:PrincipalTag` frente a `aws:ResourceTag` (ver tema *ABAC y RBAC*). Si cualquiera puede cambiar las etiquetas, puede concederse acceso → protege `TagResource`/`UntagResource` con SCP.
- **Automatización:** EventBridge/Systems Manager por etiqueta, respaldo selectivo (Backup por etiqueta), alcance de Firewall Manager por etiqueta.
- **Hallazgos:** Config con `required-tags` y Security Hub.
- **Buenas prácticas:** no pongas datos sensibles en etiquetas (aparecen en facturación y diagnósticos); define **un conjunto estándar** de claves (propietario, entorno, clasificación de datos, centro de costos).

## Patrones de examen

1. **Valores de etiqueta inconsistentes (`Prod`, `prod`, `PROD`)** → tag policy con valores permitidos.
2. **Exigir que toda instancia lleve `Owner` al crearse** → SCP con `Null` sobre `aws:RequestTag/Owner`.
3. **Impedir quitar la etiqueta de ABAC** → SCP deny sobre `UntagResource`/`DeleteTags` para esas claves.
4. **Encontrar recursos existentes sin etiquetas** → Config `required-tags`.
5. **Tag policy no impide crear recursos sin etiqueta** → correcto, solo controla valores.

## Referencias

- [Estrategia de etiquetado con tag policies y SCP](https://aws.amazon.com/blogs/mt/implement-aws-resource-tagging-strategy-using-aws-tag-policies-and-service-control-policies-scps)
- [Tipos de políticas de organización](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies.html)
