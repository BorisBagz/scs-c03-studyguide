## Idea central

La habilidad 2.1.4 pide **usar servicios de AWS para remediar incidentes de forma automática**. La guía menciona **Systems Manager**, **Automated Forensics Orchestrator for Amazon EC2**, **AWS Step Functions**, **Amazon Application Recovery Controller (ARC)** y **funciones Lambda**. El patrón común:

```
Detección (GuardDuty / Security Hub / Config / CloudWatch)
   → EventBridge (regla)
      → Orquestación: SSM Automation · Step Functions · Lambda
         → Acción: aislar, revocar, restaurar, notificar
```

## Cuándo usar cada herramienta

| Herramienta | Mejor para | Notas |
|---|---|---|
| **SSM Automation (runbooks)** | Acciones de infraestructura estándar: aislar instancia, parar, crear snapshot, aplicar parches, cambiar un security group. | Runbooks administrados por AWS o propios; permite **aprobaciones** y ejecución multicuenta y multirregión. |
| **AWS Lambda** | Lógica corta y a medida: una acción de API concreta, enriquecimiento, llamadas a sistemas externos. | Sin servidor; límites de tiempo y de complejidad. |
| **AWS Step Functions** | Flujos **con varios pasos**, ramas, reintentos, esperas y aprobaciones humanas. | Orquesta Lambda, SSM y otros servicios; mantiene el estado y deja un historial de ejecución. |
| **Automated Forensics Orchestrator for EC2** | Adquisición forense automatizada y aislamiento de instancias. | Ver el tema dedicado. |
| **ARC** | **Recuperación** de disponibilidad ante fallas de AZ o región. | No es una herramienta de contención de seguridad; sirve a la fase de recuperación. |

## Systems Manager Automation

- Un **runbook** de Automation define pasos (acciones como `aws:executeAwsApi`, `aws:runCommand`, `aws:approve`...).
- **`AutomationAssumeRole`:** rol de IAM con el que corre la automatización; aplica mínimo privilegio y permite que un respondedor ejecute acciones sin tener los permisos directos.
- **`aws:approve`:** pausa la ejecución hasta que los **aprobadores** designados la aprueben o rechacen. Hasta **10 aprobadores**, `MinRequiredApprovals` (por defecto 1), **timeout** de 7 días por defecto (máximo 30) y notificación por **SNS**. No admite automatizaciones multicuenta ni multirregión.
- **Disparadores:** EventBridge, alarmas de CloudWatch (vía OpsItems), AWS Config (remediación), consola/API.
- **Escala:** controles de tasa y de errores permiten ejecutar sobre muchos recursos con límites de concurrencia.

> **En el examen.** "Respuesta automatizada con **aprobación manual** antes de una acción destructiva" → runbook con `aws:approve` o Step Functions con un paso de espera por aprobación.

## Step Functions para respuesta a incidentes

Úsalo cuando la respuesta tiene **orden y decisiones**:

1. **Triage:** consulta metadatos de la instancia y decide si hace falta aislar o adquirir evidencia.
2. **Ramas paralelas:** snapshot de disco y captura de memoria al mismo tiempo.
3. **Aprobación o espera** de un analista.
4. **Contención:** cambiar security group, revocar sesiones del rol.
5. **Notificación** por SNS y **registro** en un almacén.
6. **Reintentos y manejo de errores** integrados.

## Ejemplos de remediaciones automáticas

| Evento | Remediación |
|---|---|
| Hallazgo de GuardDuty de credenciales usadas desde fuera de AWS | Lambda/SSM revoca las sesiones del rol (política de denegación con `aws:TokenIssueTime`) y aísla la instancia. |
| Security group abierto a `0.0.0.0/0` (regla de Config) | Remediación de Config con runbook de SSM que revoca la regla. |
| `StopLogging` en CloudTrail | EventBridge → Lambda que reactiva el trail y notifica. |
| Bucket S3 público | Lambda/SSM habilita Block Public Access. |
| Instancia con malware detectado | Step Functions: aislar, snapshot, notificar. |
| Clave de acceso expuesta | Desactivar la clave y abrir un caso. |

## Application Recovery Controller (ARC)

ARC ayuda a **prepararse y recuperarse** de fallas de disponibilidad:

| Capacidad | Alcance | Qué hace |
|---|---|---|
| **Zonal shift** | Multi-AZ | **Manualmente** y de forma temporal, desvía el tráfico de un recurso compatible fuera de una AZ con problemas. La expiración es de hasta 3 días y se puede extender. |
| **Zonal autoshift** | Multi-AZ | **AWS** desvía el tráfico automáticamente según su telemetría y lo termina cuando el problema se resuelve. |
| **Routing control** | Multi-región | Conmutación por error de **DNS** entre regiones; las *safety rules* evitan resultados no deseados (por ejemplo, tener activas dos réplicas a la vez). |
| **Region switch** | Multi-región | Planes centralizados, automatizados y observables para recuperación compleja en varias regiones y cuentas. |
| **Readiness check** | Multi-región | Monitorea cuotas, capacidad y políticas de enrutamiento para confirmar que las réplicas aguantarán una conmutación. **No va en la ruta crítica del failover.** |

> **En el examen.** Para recuperarse de una AZ degradada: **zonal shift** (manual) o **zonal autoshift** (automático). Para un failover de región basado en DNS con salvaguardas: **routing control**. El **readiness check** *prepara*, no ejecuta el failover.

## Buenas prácticas de remediación automática

- **Mínimo privilegio** en los roles de automatización y límites claros de qué pueden modificar.
- **Preservar evidencia antes de destruir** (snapshot antes de terminar una instancia).
- **Aprobación humana** para acciones de alto impacto; automatiza lo reversible.
- **Idempotencia y reintentos** para tolerar eventos duplicados.
- **Registrar todo** (historial de Automation y Step Functions, CloudTrail) y **probar** con FIS y simulaciones.
- **Evitar bucles:** una remediación que modifica un recurso puede disparar de nuevo la misma regla.

## Patrones de examen

1. **"Remediar automáticamente al detectar un security group abierto"** → regla de Config + remediación con SSM Automation.
2. **"Flujo con varios pasos, aprobación y reintentos"** → Step Functions.
3. **"Una acción puntual a la medida"** → Lambda disparada por EventBridge.
4. **"Una AZ está degradada y hay que sacar el tráfico"** → zonal shift / autoshift de ARC.
5. **"Aislar y capturar evidencia de EC2 comprometidas sin intervención manual"** → Automated Forensics Orchestrator.
6. **"Una acción destructiva requiere autorización"** → `aws:approve`.

## Referencias

- [Acción aws:approve de Systems Manager Automation](https://docs.aws.eu/systems-manager/latest/userguide/automation-action-approve.html)
- [Capacidades de Amazon Application Recovery Controller](https://docs.aws.amazon.com/r53recovery/latest/dg/what-is-route53-recovery.html)
