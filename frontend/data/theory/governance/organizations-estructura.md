## Idea central

**AWS Organizations** agrupa cuentas en una jerarquía (raíz → OU → cuentas) para aplicar **políticas, facturación y servicios compartidos** de forma centralizada. La tarea 6.1 del examen parte de aquí: una arquitectura **multi-cuenta** con una cuenta de administración mínima y servicios de seguridad **delegados**.

> **En el examen.** SCP, RCP y las políticas declarativas **requieren el modo "all features"** (no solo facturación consolidada). Y la regla de oro: **mantén la cuenta de administración (management) casi vacía** y delega la administración de los servicios.

## Conceptos

| Concepto | Detalle |
|---|---|
| **Raíz y OU** | Contenedores jerárquicos; las políticas se adjuntan a raíz, OU o cuenta y se **heredan** |
| **Cuenta de administración** | Crea y gestiona la organización; **las SCP y RCP no la afectan** |
| **Cuentas miembro** | Sujetas a SCP/RCP, incluidas las que son administrador delegado |
| **All features** | Necesario para políticas de organización (SCP, RCP, declarativas, etiquetas, respaldo...) |
| **Acceso de confianza (trusted access)** | Permite que un servicio AWS opere en toda la organización |
| **Administrador delegado** | Cuenta miembro designada para administrar un servicio en nombre de la organización |

## Recomendaciones para la cuenta de administración

Tomadas de la *AWS Security Reference Architecture* (Prescriptive Guidance):

- **Cargas de trabajo mínimas:** solo lo imprescindible.
- Correo electrónico **administrado por la empresa**, con contactos de seguridad y administrativos actualizados (incluido teléfono).
- **MFA para todos** y revisión periódica de accesos.
- **Delegar** la administración siempre que se pueda; IAM Identity Center puede delegarse a la cuenta de servicios compartidos (aunque sigue ejecutándose en la cuenta de administración para algunas tareas).
- Restringir en esta cuenta a los usuarios de **Artifact** solo a la función de acuerdos (*Agreements*).
- Crear y aplicar las **SCP desde la cuenta de administración** (afectan solo a las miembro).

## Delegación recomendada (SRA)

| Cuenta | Servicios delegados |
|---|---|
| **Security Tooling** | Security Hub, GuardDuty, Config, IAM Access Analyzer, trail de organización de CloudTrail, Macie, **gestión centralizada del acceso root**, acceso de auditores a Artifact |
| **Shared Services** | Administración de IAM Identity Center |
| Opcionales | Detective y Audit Manager (si hay equipos forenses o de auditoría dedicados) |

Despliega los servicios centrales de seguridad (Security Hub, GuardDuty, Config...) en **todas las cuentas** como parte del *onboarding* y la línea base.

## Capas de control preventivo

| Política | Qué limita |
|---|---|
| **SCP** | Permisos máximos de **principales** |
| **RCP** | Permisos máximos sobre **recursos** |
| **Declarativas** | **Configuración base** de servicios (se aplica en el plano de control del servicio) |

Las tres se combinan; ver los temas dedicados. Para línea base adicional se usa **Customizations for AWS Control Tower (CfCT)**, que despliega plantillas de CloudFormation y SCP a cuentas y OU.

## Patrones de examen

1. **Dónde se ejecutan los servicios de seguridad de la organización** → cuenta de seguridad como administrador delegado, no la de administración.
2. **Una SCP no restringe lo que hace la cuenta de administración** → correcto: usa otros controles (IAM, buenas prácticas, mínimo uso).
3. **Quiero SCP y solo tengo facturación consolidada** → habilitar all features.
4. **Un servicio debe operar sobre toda la organización** → habilitar acceso de confianza + administrador delegado.
5. **Nuevas cuentas deben nacer con la línea base de seguridad** → Control Tower / CfCT / StackSets automáticos.

## Referencias

- [Cuenta de administración de la organización (SRA)](https://docs.aws.amazon.com/prescriptive-guidance/latest/security-reference-architecture/org-management.html)
- [Tipos de políticas de organización](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies.html)
