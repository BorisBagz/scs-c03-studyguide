## Idea central

La habilidad 1.1.5 pide **crear y administrar automatizaciones para evaluaciones e investigaciones periódicas**. Los ejemplos de la guía oficial son **AWS Config conformance packs**, **Security Hub** y **Systems Manager State Manager**. Los tres responden a la misma pregunta desde ángulos distintos: *¿mis recursos siguen en el estado deseado y qué hago si no?*

| Servicio | Qué evalúa | Qué entrega |
|---|---|---|
| **AWS Config** | Configuración de **recursos AWS** a lo largo del tiempo | Línea de tiempo de configuración y cumplimiento por regla |
| **Conformance packs** | Un **conjunto** de reglas y remediaciones desplegado como unidad | Cumplimiento agrupado para un marco (CIS, PCI...) |
| **Systems Manager State Manager** | Configuración **dentro de nodos administrados** (instancias, servidores) | Aplicación periódica del estado deseado y compliance |
| **Security Hub** | Controles de estándares de seguridad | Hallazgos agregados |

## AWS Config

- **Config recorder.** Registra los cambios de configuración de los recursos soportados (un *configuration item* por cambio). Sin recorder no hay evaluaciones.
- **Reglas.** *Managed rules* (de AWS) o *custom rules* (con Lambda o **AWS CloudFormation Guard**). Se evalúan ante cambios de configuración o de forma periódica.
- **Remediación.** Cada regla puede tener una **acción de remediación**, que es un **documento de SSM Automation**. Puede ser **manual** o **automática**; puedes definir **reintentos** (por ejemplo, 5 intentos en 300 segundos) y pasar el ID del recurso incumplidor como parámetro. Se configura con `PutRemediationConfigurations`.
- **Agregadores.** Un **aggregator** consolida datos de cumplimiento de **varias cuentas y regiones** en una cuenta, sin cambiar las cuentas de origen.

> **Cuidado.** La remediación automática trabaja sobre una *instantánea* periódica de cumplimiento, no sobre la evaluación en vivo: puede arrancar sobre un recurso que ya es compatible.

## Conformance packs

Un **conformance pack** es una colección de **reglas de Config y acciones de remediación** que se despliega como una sola entidad desde una plantilla YAML (similar a CloudFormation). Sirve para aplicar un conjunto coherente (por ejemplo, controles de un marco regulatorio) a una cuenta y región.

**Organization conformance pack:**

- Se despliega **de forma central** a las cuentas de **AWS Organizations**, desde la cuenta de administración o un **administrador delegado** (`PutOrganizationConformancePack`). También desde la consola de **Systems Manager Quick Setup**.
- Puedes **excluir cuentas**, y desde la cuenta de administración evitas que las cuentas miembro **modifiquen** las reglas y remediaciones desplegadas.
- Las **cuentas nuevas** que se unen a la organización reciben el pack automáticamente; las que salen lo pierden. Si la cuenta nueva no tiene recorder, el despliegue se reintenta durante **7 horas**.
- Con administrador delegado, el *service-linked role* de la cuenta de administración **no se crea automáticamente**; si quieres desplegar también en ella, créalo manualmente.
- El despliegue es **regional**: repite la llamada por región.
- Requiere que **AWS Config esté grabando**.

## Systems Manager State Manager

**State Manager** mantiene tus **nodos administrados** en el estado deseado mediante **associations**: la asociación vincula un **documento SSM** (comando o runbook de Automation) con **targets** y un **calendario**.

- **Targets:** IDs de instancia, **tags**, grupos de recursos o todos los nodos de la región. Los dinámicos (grupos de recursos, Auto Scaling groups) aplican también a nodos que se incorporan después.
- **Calendario:** expresión `cron` o `rate`. Por defecto la asociación se ejecuta **al crearse**, luego según el calendario y cuando cambian los targets; con `--apply-only-at-cron-interval` solo corre en el calendario.
- **Compliance:** cada asociación reporta si el nodo cumple, con una **severidad** (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `UNSPECIFIED`).
- **Ejemplos de uso:** mantener instalado y en ejecución un agente antivirus, cerrar puertos, actualizar el **SSM Agent** semanalmente, aplicar una configuración de **CloudWatch Agent**.

```bash
aws ssm create-association \
  --name "AWS-UpdateSSMAgent" \
  --targets "Key=tag:Environment,Values=Prod" \
  --schedule-expression "cron(0 0 ? * SUN *)" \
  --apply-only-at-cron-interval \
  --compliance-severity HIGH
```

## Cómo se combinan

1. **Config** detecta que un security group permite `0.0.0.0/0` en el puerto 22 (regla `restricted-ssh`).
2. La **remediación automática** ejecuta un runbook de SSM Automation que revoca la regla.
3. Un **conformance pack organizacional** garantiza que esa regla exista en todas las cuentas.
4. **Security Hub** agrega el resultado junto con los demás hallazgos.
5. **State Manager** asegura que dentro de las instancias el agente y la configuración sigan como se definió.

## Patrones de examen

1. **"Aplicar el mismo conjunto de reglas de cumplimiento a todas las cuentas, incluidas las nuevas"** → organization conformance pack.
2. **"Ver el cumplimiento de varias cuentas y regiones en un solo lugar"** → Config aggregator (o Security Hub con agregación).
3. **"Remediar automáticamente un recurso incumplidor"** → regla de Config + remediación automática con SSM Automation.
4. **"Mantener una configuración en las instancias de forma continua"** → State Manager association (con tags como target).
5. **"Evitar que las cuentas miembro modifiquen las reglas"** → desplegar con organization conformance pack desde la cuenta de administración.
6. **"Sin recorder no hay evaluación"** → comprueba siempre que AWS Config esté grabando.

## Referencias

- [Remediar recursos no compatibles con AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/setup-autoremediation.html)
- [Conformance packs de organización](https://docs.aws.amazon.com/config/latest/developerguide/conformance-pack-organization-apis.html)
- [Crear una asociación de State Manager (CLI)](https://docs.aws.amazon.com/cli/latest/reference/ssm/create-association.html)
