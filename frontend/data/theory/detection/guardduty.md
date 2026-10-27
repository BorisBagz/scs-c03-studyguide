## Qué es y qué problema resuelve

**Amazon GuardDuty** es el servicio administrado de **detección de amenazas** de AWS. Analiza de forma continua fuentes de datos de tu cuenta, aplica inteligencia de amenazas, detección de anomalías y machine learning, y produce **hallazgos (findings)** priorizados por severidad. No necesitas desplegar agentes ni appliances para la detección base, y no consume rendimiento de tus recursos.

Es un servicio **regional**: se habilita por región y los hallazgos viven en la región donde se generan.

> **En el examen.** GuardDuty *detecta*, no *bloquea ni remedia*. Si una pregunta pide "detectar" actividad sospechosa con el menor esfuerzo operativo, GuardDuty suele ser la respuesta. Si pide "bloquear", la respuesta está en otro servicio (WAF, Network Firewall, SCP, security groups...) o en una automatización que reaccione al hallazgo.

## Fuentes de datos

**Monitoreo base (foundational).** GuardDuty analiza directamente estos flujos, sin que tengas que habilitar los servicios de origen:

- Eventos de administración de **CloudTrail** (y otros eventos de CloudTrail que alimentan las detecciones).
- **VPC Flow Logs**.
- Logs de **DNS** (consultas del resolver de la VPC).

> **Detalle útil.** No necesitas activar VPC Flow Logs ni guardar logs DNS para que GuardDuty los analice: usa copias independientes y administradas por el servicio.

## Planes de protección

Además del monitoreo base, hay **planes de protección opcionales**, que se activan por separado:

| Plan | Qué analiza o protege |
|---|---|
| **S3 Protection** | Operaciones a nivel de objeto en S3 (exfiltración, intentos de destrucción, logging de acceso deshabilitado, cambios de bucket policy que expongan el bucket). |
| **EKS Protection** | Logs de auditoría de Kubernetes (control plane) de clústeres EKS, por ejemplo escalación de privilegios mediante cambios de role binding. |
| **Runtime Monitoring** | Eventos a nivel de sistema operativo en cargas **EKS, EC2 y ECS (incluido Fargate)**: ejecución de procesos, cambios en el sistema de archivos y conexiones de red. Usa un agente de seguridad. |
| **Malware Protection for EC2** | Escanea volúmenes **EBS** asociados a instancias EC2, sin agente, a demanda (cuando hay un hallazgo) o de forma continua. |
| **Malware Protection for S3** | Escanea objetos **recién cargados** a un bucket. |
| **RDS Protection** | Actividad de inicio de sesión en bases Aurora y RDS compatibles; arma una línea base de comportamiento y marca accesos anómalos. |
| **Lambda Protection** | Actividad de red de funciones Lambda (empezando por VPC Flow Logs) para detectar minería de criptomonedas o comunicación con servidores maliciosos. |

**Extended Threat Detection (ETD)** correlaciona señales de varios planes y recursos para identificar **secuencias de ataque** de varias etapas (descubrimiento de privilegios, manipulación de APIs, persistencia, exfiltración). Se incluye por defecto, sin costo adicional, asigna severidad **Critical** a las secuencias más urgentes y las mapea a tácticas y técnicas de **MITRE ATT&CK**.

> **En el examen.** Relaciona la necesidad con el plan: *"detectar malware en objetos subidos a S3"* → Malware Protection for S3; *"detectar procesos maliciosos dentro de contenedores o instancias"* → Runtime Monitoring; *"actividad anómala contra un bucket (exfiltración, borrado)"* → S3 Protection; *"credenciales de DB comprometidas"* → RDS Protection; *"ataque en varias etapas"* → Extended Threat Detection.

## Hallazgos (findings)

### Formato del tipo de hallazgo

```
ThreatPurpose:ResourceTypeAffected/ThreatFamilyName.DetectionMechanism!Artifact
```

| Parte | Significado |
|---|---|
| `ThreatPurpose` | Propósito o etapa del ataque (`Recon`, `Backdoor`, `Impact`, `CryptoCurrency`, `UnauthorizedAccess`, `Persistence`, `Exfiltration`...). |
| `ResourceTypeAffected` | Tipo de recurso AWS objetivo (`EC2`, `IAMUser`, `S3`...). |
| `ThreatFamilyName` | La amenaza o actividad detectada. |
| `DetectionMechanism` | Opcional. Cómo se detectó (`.Tcp`, `.Udp`, `.Reputation`...). |
| `Artifact` | Opcional. Recurso involucrado propiedad de la herramienta (`!DNS`). |

Ejemplos: `Recon:EC2/PortProbeUnprotectedPort`, `CryptoCurrency:EC2/BitcoinTool.B!DNS`, `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS`.

> **En el examen.** Leer el nombre del hallazgo te dice qué pasó: `InstanceCredentialExfiltration.OutsideAWS` significa que **credenciales temporales de un rol de instancia EC2 se usan desde fuera de AWS**. La respuesta típica es revocar sesiones del rol y aislar o reemplazar la instancia.

### Severidad

Cada hallazgo tiene una severidad numérica de **1.0 a 10.0**:

| Nivel | Rango | Significado |
|---|---|---|
| **Critical** | 9.0 – 10.0 | Una secuencia de ataque puede estar en curso o haber ocurrido; recursos posiblemente comprometidos. |
| **High** | 7.0 – 8.9 | El recurso está comprometido y se usa activamente para fines no autorizados. |
| **Medium** | 4.0 – 6.9 | Actividad sospechosa que se desvía del comportamiento normal. |
| **Low** | 1.0 – 3.9 | Intento sospechoso que no comprometió el entorno (escaneo de puertos, intrusión fallida). |

### Retención

GuardDuty conserva los hallazgos **90 días**. Para conservarlos más tiempo, configura la **exportación a S3** (el bucket de destino debe permitir a GuardDuty escribir, y los hallazgos se cifran con una llave de **KMS** que tú administras).

## Integración y automatización

- **Amazon EventBridge.** Cada hallazgo genera un evento con `source = aws.guardduty` y `detail-type = GuardDuty Finding`. Los hallazgos **nuevos** se envían casi en tiempo real (no se puede cambiar). Las **ocurrencias posteriores** del mismo hallazgo se agregan: por defecto cada **6 horas**, configurable a **15 minutos, 1 hora o 6 horas** (solo el administrador; aplica a todos los miembros).
- **Patrón típico:** regla de EventBridge filtrando por severidad (`"detail": {"severity": [{"numeric": [">=", 7]}]}`) → destino **SNS** (notificar), **Lambda** o **Systems Manager Automation** (remediar) o **Step Functions**.
- **Security Hub y Detective.** Los hallazgos fluyen a Security Hub (agregación) y se pueden investigar en **Amazon Detective**.
- **Malware Protection for EC2** se dispara a partir de ciertos hallazgos; si un hallazgo está **suprimido**, no lanza el escaneo.

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": { "severity": [{ "numeric": [">=", 7] }] }
}
```

## Múltiples cuentas

La práctica recomendada es administrar GuardDuty con **AWS Organizations**:

- La **cuenta de administración** de la organización designa un **administrador delegado** de GuardDuty (una cuenta de seguridad, no la de administración).
- El administrador delegado ve los hallazgos de **todas** las cuentas miembro, habilita planes de protección para toda la organización y puede configurar la **autohabilitación**: `ALL`, `NEW` o `NONE`.
- Alternativa: **invitaciones** (la cuenta administradora invita a cuentas miembro; cada miembro acepta). Se usa cuando las cuentas no están en la misma organización.
- Solo el administrador puede crear y administrar **reglas de supresión**, **listas de IP de confianza** y **listas de inteligencia de amenazas**. Los miembros no pueden cambiarlas.
- La pertenencia se evalúa **por región**: debes habilitar GuardDuty en cada región donde quieras cobertura (estado `RegionDisabled` si falta).
- El administrador delegado **no puede desactivar** GuardDuty directamente en un miembro: primero lo desasocia y lo elimina; con autohabilitación en `ALL` solo puede desasociar si cambia esa configuración.
- **Malware Protection for S3** lo controla cada cuenta miembro, no el administrador.

> **En el examen.** "Visibilidad centralizada de amenazas en toda la organización, incluidas cuentas nuevas" → **administrador delegado + autohabilitación (`ALL` o `NEW`)**. "Cuenta de seguridad central" es una pista de que se usa administrador delegado, no la cuenta de administración.

## Reducir ruido: supresión y listas

| Mecanismo | Para qué |
|---|---|
| **Reglas de supresión** | Archivan automáticamente hallazgos nuevos que coinciden con criterios (tipo de hallazgo, IP del llamador, tag de instancia, imagen...). Los hallazgos se generan pero quedan **archivados**: no se envían a Security Hub, S3, Detective ni EventBridge. Se conservan 90 días. |
| **Lista de IP de confianza** | IPs que tú declaras seguras; GuardDuty no genera hallazgos de ese tráfico. Solo el administrador la gestiona. |
| **Lista de amenazas** | IPs o dominios maliciosos conocidos que quieres que GuardDuty trate como amenaza. Solo el administrador la gestiona. |

> **Cuidado.** Los hallazgos archivados **no cuentan como señales** para Extended Threat Detection. Una regla de supresión demasiado amplia (por ejemplo, todo EKS) puede ocultar los pasos de un ataque de varias etapas. Crea reglas solo para comportamiento benigno que ya confirmaste repetidamente.

## Patrones de examen

1. **Detectar sin agentes y con poco esfuerzo** → GuardDuty (base).
2. **Hallazgo por credenciales usadas fuera de AWS** → revocar sesiones del rol (política de denegación con `aws:TokenIssueTime`), aislar la instancia, investigar con CloudTrail y Detective.
3. **Alertar al equipo ante severidad alta** → regla de EventBridge + SNS.
4. **Remediación automática** → EventBridge → Lambda / SSM Automation / Step Functions (por ejemplo, cambiar el security group de la instancia a uno de cuarentena).
5. **Muchos falsos positivos de un escáner autorizado** → regla de supresión acotada, no deshabilitar el servicio.
6. **Guardar hallazgos más de 90 días** → exportar a un bucket S3 cifrado con KMS.
7. **Toda la organización, incluidas cuentas futuras** → administrador delegado + autohabilitación.

## Referencias

- [Qué es Amazon GuardDuty](https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html)
- [Planes de protección y Extended Threat Detection (blog de seguridad de AWS)](https://aws.amazon.com/blogs/security/navigating-amazon-guardduty-protection-plans-and-extended-threat-detection)
- [Formato de los tipos de hallazgo](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-format.html)
- [Niveles de severidad](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings-severity.html)
- [Procesar hallazgos con EventBridge](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html)
- [Relación administrador-miembro](https://docs.aws.amazon.com/guardduty/latest/ug/administrator_member_relationships.html)
- [Reglas de supresión](https://docs.aws.amazon.com/guardduty/latest/ug/findings_suppression-rule.html)
