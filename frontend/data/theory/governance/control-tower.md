## Idea central

**AWS Control Tower** configura y gobierna un entorno multi-cuenta (*landing zone*) con buenas prácticas, y aplica **controles** (antes llamados *guardrails*) a las OU. Orquesta Organizations, IAM Identity Center, Config, CloudTrail, CloudFormation y más.

> **En el examen.** Si hay que "preparar un entorno multi-cuenta con línea base, registro centralizado y controles preventivos y detectivos con el menor esfuerzo", la respuesta es **Control Tower**. Para personalizar la línea base: **CfCT** (Customizations for AWS Control Tower).

## Comportamientos de los controles (verificado)

| Comportamiento | Qué hace | Estados | Mecanismo |
|---|---|---|---|
| **Preventivo** | Impide acciones que causarían incumplimiento | Enforced / not enabled | **SCP, RCP y políticas declarativas** |
| **Detectivo** | Detecta recursos no conformes y alerta en el panel | Clear / in violation / not enabled | **Reglas de AWS Config** (los controles de Security Hub integrados son reglas de Config) |
| **Proactivo** | Escanea los recursos **antes de aprovisionarlos** y bloquea los no conformes | PASS / FAIL / SKIP | **CloudFormation Hooks** (solo recursos aprovisionados con CloudFormation) |

Los controles preventivos funcionan en **todas las Regiones soportadas**; los detectivos solo en las Regiones soportadas por Control Tower.

## Guía de aplicación (guidance)

| Guía | Significado |
|---|---|
| **Obligatoria (mandatory)** | Protege los recursos desplegados por Control Tower. Desde **landing zone 4.0** ya **no se aplican por defecto** |
| **Muy recomendada** | Buenas prácticas de entornos multi-cuenta; se aplica a nivel de OU |
| **Electiva** | Rastrea o restringe acciones habituales en empresas; se aplica a nivel de OU |

La guía es independiente del comportamiento (un control preventivo puede ser electivo, por ejemplo).

## Ideas de operación

- Los controles se habilitan **por OU** y afectan a todas las cuentas de esa OU.
- Las SCP que despliega llevan la etiqueta `aws-control-tower = managed-by-control-tower`.
- Control Tower detecta **deriva** del landing zone y de los controles.
- Control Tower **no reemplaza** a Security Hub, GuardDuty ni Config: los habilita y orquesta, pero esos servicios se siguen gobernando en la cuenta de seguridad.

> **Nota de verificación.** Los detalles de *Account Factory*, las cuentas de Log Archive y Audit y la lista concreta de controles no se contrastaron en esta sesión (la página consultada trata los comportamientos y la guía).

## Patrones de examen

1. **Impedir (no solo detectar) que se cambie la configuración de Config en cuentas** → control preventivo (SCP).
2. **Detectar buckets públicos en todas las cuentas de una OU** → control detectivo (regla de Config).
3. **Bloquear una plantilla de CloudFormation que crea un bucket sin cifrado antes de desplegarla** → control proactivo (Hooks).
4. **Añadir recursos a toda cuenta nueva** → CfCT o StackSets con despliegue automático.
5. **Controles obligatorios desaparecieron tras actualizar** → desde landing zone 4.0 no se aplican por defecto.

## Referencias

- [Comportamiento y guía de los controles](https://docs.aws.amazon.com/controltower/latest/controlreference/control-behavior.html)
- [Qué es AWS Control Tower](https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html)
