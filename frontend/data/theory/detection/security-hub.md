## Qué es

**AWS Security Hub** es el punto central para **ver, priorizar y responder** a los problemas de seguridad de tus cuentas. Hoy conviven dos piezas que debes distinguir:

| Pieza | Qué aporta |
|---|---|
| **AWS Security Hub** (la solución unificada actual) | Correlaciona y enriquece señales de varios servicios para priorizar lo crítico. Incluye **exposure findings**, análisis de acceso no usado, panel con **attack path**, flujos de respuesta y tickets. Genera hallazgos en formato **OCSF**. |
| **Security Hub CSPM** | La parte de **gestión de postura**: ejecuta **controles** contra **estándares** de seguridad y produce hallazgos de cumplimiento. Es una de las fuentes de señal de Security Hub. |

Fuentes de señal que Security Hub ingiere: controles de **Security Hub CSPM** (postura), **Amazon Inspector** (vulnerabilidades), **Amazon Macie** (datos sensibles), **Amazon GuardDuty** (amenazas) e **IAM Access Analyzer** (acceso).

> **En el examen.** La guía oficial menciona Security Hub en las habilidades *agregar eventos de seguridad* (1.1.3), *crear alertas y dashboards* (1.1.4), *automatizar evaluaciones* (1.1.5), *analizar logs* (1.2.4) y *evaluar cumplimiento* (6.3.1). El formato ASFF fue **retirado** del temario; el formato relevante es **OCSF**.

## Capacidades clave del Security Hub unificado

- **Exposure findings.** Correlacionan hallazgos de controles CSPM, Inspector y otros servicios para detectar **exposiciones** asociadas a un recurso (por ejemplo, una instancia con vulnerabilidad *y* alcanzable desde internet *y* con un rol demasiado permisivo).
- **Análisis de acceso no usado.** Identifica roles, usuarios, claves de acceso y permisos sin uso en una ventana de **90 días**. Al habilitar Security Hub se crea un **IAM Access Analyzer** vinculado al servicio, y para permisos no usados puede generar **recomendaciones de políticas de mínimo privilegio**.
- **Dashboard y attack path.** Muestra exposiciones, amenazas, cobertura y recursos; el *attack path* visualiza cómo un atacante podría llegar a un recurso.
- **Flujos de respuesta.** Respuesta automatizada y ticketing integrado (por ejemplo, **Jira Cloud** y **ServiceNow ITSM**).
- **Alcance.** Se habilita para cuentas individuales o para **toda la organización**.

## Security Hub CSPM: estándares y controles

- **Estándares.** *AWS Foundational Security Best Practices (FSBP)* es el estándar por defecto. Otros son opcionales: **CIS AWS Foundations Benchmark**, **NIST SP 800-53 Rev. 5**, **NIST SP 800-171**, **PCI DSS**, AWS Resource Tagging Standard y AI Security Best Practices.
- **Controles.** Cada estándar es un conjunto de controles. La mayoría se evalúan con **reglas vinculadas al servicio de AWS Config**, por lo que **AWS Config debe estar habilitado** (y grabando los tipos de recurso) en cada cuenta y región.
- **Evaluación.** Se reevalúa ante cambios de configuración o de forma periódica (típicamente cada **12 a 24 horas**); no puedes forzar la reevaluación de un control periódico.
- **Hallazgos.** Un hallazgo representa un par *recurso–control* y se **actualiza en el mismo registro** cuando cambia el estado. Al deshabilitar un control, sus hallazgos se archivan; los archivados se conservan **30 días**, así que no sirven como registro de auditoría a largo plazo (exporta a S3 si lo necesitas).

## Administración multicuenta y multirregión

- **Administrador delegado.** La cuenta de administración de Organizations designa un **administrador delegado** (se recomienda una cuenta dedicada de herramientas de seguridad). Ese administrador ve los hallazgos de todas las cuentas.
- **Configuración central (central configuration).** Con **políticas de configuración** defines desde el administrador delegado qué cuentas y OUs tienen Security Hub habilitado, qué estándares y qué controles aplican. La política por defecto cubre todas las cuentas y regiones, habilita FSBP y se aplica a las cuentas nuevas. La alternativa es la **configuración local**, manual por cuenta y región.
- **Agregación entre regiones.** Hallazgos, actualizaciones, insights, estados de controles y puntaje de seguridad de varias regiones pueden consolidarse en **una región de agregación**. La configuración central lo establece automáticamente. Los controles de **recursos globales** (por ejemplo, IAM) se deshabilitan en todas las regiones menos la región principal para no duplicar hallazgos.

## Automatización

| Mecanismo | Cuándo usarlo |
|---|---|
| **Reglas de automatización (automation rules)** | Modificar o suprimir hallazgos **sin código**, en el momento de la ingesta (por ejemplo, subir severidad de hallazgos de cuentas de producción o suprimir un control en cuentas de prueba). Solo las gestiona la cuenta administradora; hasta **100 por cuenta administradora**, se crean por región y se aplican en orden numérico (menor primero). |
| **EventBridge + acciones personalizadas** | Respuesta automatizada con código: enviar a SNS, Lambda, SSM Automation, un SIEM o un sistema de tickets. Los hallazgos llegan a EventBridge como eventos. |
| **Automated Security Response on AWS** | Solución de AWS con acciones de remediación predefinidas. |

> **Distinción importante.** Las *automation rules* **cambian el hallazgo** (severidad, estado, notas); EventBridge **dispara acciones sobre el entorno**. Si la pregunta pide "sin escribir código" o "ajustar severidad automáticamente", piensa en automation rules.

## Patrones de examen

1. **Vista única de seguridad de toda la organización** → administrador delegado de Security Hub + configuración central + región de agregación.
2. **Validar la postura contra CIS o PCI DSS** → habilitar el estándar en Security Hub CSPM (requiere AWS Config).
3. **Hallazgos de GuardDuty, Inspector y Macie en un solo lugar** → Security Hub los agrega automáticamente cuando ambos servicios están habilitados.
4. **Conservar hallazgos más de 30 días** → exportar a S3 vía EventBridge.
5. **Priorizar automáticamente (subir o bajar severidad)** → automation rules.
6. **Remediar automáticamente un control fallido** → EventBridge → Lambda/SSM Automation, o Automated Security Response on AWS.

## Referencias

- [Introducción a AWS Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub-v2.html)
- [Guía de mejores prácticas de Security Hub CSPM](https://aws.github.io/aws-security-services-best-practices/guides/security-hub-cspm/)
- [Preguntas frecuentes de Security Hub](https://aws.amazon.com/security-hub/faqs)
