## Idea central

**AWS Config** registra la **configuración** de tus recursos y la **evalúa contra reglas**, para saber qué cambió, cuándo y si cumple. Es el motor detectivo de gobierno (alimenta Control Tower y Security Hub). Aparece también en el Dominio 1 (monitoreo); aquí importa su papel de **cumplimiento multi-cuenta**.

> **En el examen.** Config **no bloquea** cambios no conformes: los detecta (o los corrige con remediación). Para prevenir, usa IAM/SCP, Service Catalog o controles proactivos/Hooks.

## Funcionamiento (verificado en las FAQ)

| Elemento | Detalle |
|---|---|
| **Elementos de configuración (CI)** | Instantáneas puntuales: datos básicos, ajustes, **relaciones**, ID de eventos de CloudTrail relacionados |
| **Registro** | Continuo (por defecto) o **periódico** (cada 24 h, solo si hubo cambio); también recursos de terceros o personalizados |
| **Reglas administradas** | Predefinidas, pocos parámetros |
| **Reglas personalizadas** | Lógica en **Lambda** en tu cuenta (también existe Guard) |
| **Disparo** | Al cambiar la configuración o **periódico** (1, 3, 6, 12 o 24 h) |
| **Límite por defecto** | 150 reglas por cuenta |
| **Modo de evaluación** | **Detectivo** (tras registrar el cambio), **proactivo** (antes de aprovisionar), o ambos |
| **Remediación** | Acciones asociadas a reglas (Systems Manager Automation) |

## Multi-cuenta

| Capacidad | Qué hace |
|---|---|
| **Conformance pack** | Paquete de **reglas + remediaciones** en una plantilla YAML, desplegable a toda la organización, con informe de cumplimiento del paquete; las cuentas miembro **no pueden modificar ni borrar** las reglas administradas del paquete |
| **Agregador** | Reúne configuración y cumplimiento de **varias cuentas y Regiones** en una; panel con reglas y cuentas no conformes. Fuera de Organizations, las cuentas deben **autorizar** al agregador |
| **Despliegue de reglas** | La agregación es para **reporte**, no para aprovisionar; para desplegar reglas se usan StackSets o conformance packs |
| **Entrega** | Datos hacia un bucket S3 o tópico SNS compartidos, con políticas IAM adecuadas |

## Buenas prácticas

1. Habilita Config en **todas las cuentas y Regiones** (Control Tower/StackSets).
2. **Conformance packs** alineados a un marco (CIS, NIST, PCI) desplegados a la organización.
3. **Agregador** en la cuenta de seguridad (administrador delegado).
4. **Remediación automática** para casos seguros (p. ej., cifrar bucket); con aprobación para los de mayor impacto.
5. Notificar incumplimientos por **EventBridge**; hallazgos en Security Hub.
6. Considera la capacidad de **consultas avanzadas** y el historial de configuración para investigaciones (la página de FAQ no los detalla).

## Reglas citadas en este curso

`s3-bucket-ssl-requests-only`, `s3-bucket-server-side-encryption-enabled`, `encrypted-volumes`, `rds-storage-encrypted`, `iam-customer-policy-blocked-kms-actions`, `iam-inline-policy-blocked-kms-actions`, `alb-http-to-https-redirection-check`, `required-tags`, `secretsmanager-rotation-enabled-check`.

## Patrones de examen

1. **Saber quién cambió un SG y cuándo** → historial de Config + CloudTrail.
2. **Ver cumplimiento de toda la organización en un panel** → agregador + conformance packs.
3. **Corregir automáticamente un bucket sin cifrado** → regla + remediación (SSM Automation).
4. **Evaluar una plantilla antes de crear recursos** → reglas proactivas de Config / Hooks.
5. **Las cuentas miembro desactivan una regla del paquete** → no pueden: es de conformance pack organizacional.
6. **Config no impide el cambio** → es detectivo; usar SCP/IAM para prevenir.

## Referencias

- [Preguntas frecuentes de AWS Config](https://aws.amazon.com/config/faq/)
- [Conformance packs (anuncio)](https://aws.amazon.com/about-aws/whats-new/2019/11/introducing-aws-config-conformance-packs)
