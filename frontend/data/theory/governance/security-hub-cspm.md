## Idea central

**AWS Security Hub** centraliza hallazgos y evalúa la **postura de seguridad** frente a estándares. La parte de gestión de postura se denomina ahora **Security Hub CSPM**. Para gobierno importa: **estándares y controles, puntuación de seguridad, agregación entre cuentas y Regiones y configuración central**.

> **En el examen.** "Ver en un solo lugar el cumplimiento de CIS/NIST/PCI de toda la organización" → **Security Hub (CSPM) con administrador delegado y Región de agregación**. Para activar estándares en todas las cuentas y Regiones: **configuración central**.

## Estándares y controles (verificado)

- Un **estándar** es un conjunto de requisitos basado en marcos regulatorios, buenas prácticas del sector o políticas internas.
- **Habilitar un estándar activa automáticamente** todos los controles que le aplican; se generan **hallazgos** con los resultados.
- Puedes **deshabilitar y rehabilitar controles** individuales; deshabilitar un estándar detiene sus comprobaciones y los hallazgos.
- **Puntuación de seguridad** por estándar habilitado, según el estado de sus controles. Con Región de agregación abarca todas las Regiones enlazadas; con administrador delegado, todas las cuentas de la organización.
- AWS recomienda la **configuración central** para entornos multi-cuenta y multi-Región: el administrador delegado define políticas que configuran estándares en cuentas y Regiones.

> **Nota de verificación.** La página consultada no lista los estándares individuales ni confirma la relación con Config. Habitualmente se ofrecen **AWS Foundational Security Best Practices**, **CIS AWS Foundations**, **NIST SP 800-53** y **PCI DSS**, y muchos controles se implementan con **reglas de Config** (por eso Config debe estar habilitado). Confirma en la referencia de estándares.

## Cómo encaja en gobierno

| Elemento | Detalle |
|---|---|
| **Administrador delegado** | Cuenta de seguridad (Security Tooling): ve y gestiona toda la organización |
| **Agregación entre Regiones** | Una Región de agregación consolida hallazgos y puntuaciones |
| **Configuración central** | Políticas de Security Hub aplicadas a OU/cuentas/Regiones |
| **Política de organización de Security Hub** | Tipo de política declarativa para cerrar brechas de cobertura |
| **Integraciones** | GuardDuty, Inspector, Macie, Access Analyzer, Config, Firewall Manager y más envían hallazgos |
| **Automatización** | Reglas de EventBridge y de automatización para notificar o remediar |
| **Formato** | Hallazgos en formato **OCSF** (ASFF fue retirado del temario del examen) |

> **Nota de verificación.** El soporte OCSF y la transición de nombres del servicio no se contrastaron en esta sesión; confirma en la documentación vigente antes de citar nombres exactos.

## Security Hub frente a otros servicios

| Servicio | Papel |
|---|---|
| **Security Hub (CSPM)** | Agrega y puntúa postura, ejecuta comprobaciones de estándares |
| **Config** | Registra y evalúa configuración (base de muchas comprobaciones) |
| **GuardDuty / Inspector / Macie** | **Generan** hallazgos; Security Hub los **centraliza** |
| **Audit Manager** | Recoge evidencia para auditorías (ver tema) |
| **Control Tower** | Despliega controles gestionados (algunos son controles de Security Hub) |

## Patrones de examen

1. **Dashboard único de cumplimiento de la organización** → Security Hub con administrador delegado.
2. **Habilitar el mismo estándar en 100 cuentas y 5 Regiones** → configuración central.
3. **Consolidar hallazgos de varias Regiones** → Región de agregación.
4. **Un control no aplica a mi entorno** → deshabilitar ese control (con justificación).
5. **Los hallazgos de postura no aparecen** → Config no está habilitado o el estándar no está activado.
6. **Notificar al SOC ante un hallazgo crítico** → EventBridge sobre eventos de hallazgos.

## Referencias

- [Estándares de seguridad en Security Hub CSPM](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards.html)
- [Mejores prácticas de Security Hub CSPM](https://aws.github.io/aws-security-services-best-practices/guides/security-hub-cspm/)
