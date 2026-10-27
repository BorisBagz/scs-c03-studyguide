## Idea central

La habilidad 2.1.1 pide **diseñar e implementar planes de respuesta y runbooks** para incidentes de seguridad. Los ejemplos que cita la guía oficial son **Systems Manager OpsCenter** y los **notebooks de Amazon SageMaker AI**. La idea de fondo: una respuesta rápida y repetible depende de documentar *qué hacer* antes del incidente y de dejarlo ejecutable.

## Plan, playbook y runbook

| Documento | Qué es | Ejemplo |
|---|---|---|
| **Plan de respuesta a incidentes** | Documento de alto nivel que define el programa y la estrategia: roles (matriz **RACI**), plan de comunicación, definición de incidente y fases. | "Quién declara un incidente y a quién se escala" |
| **Playbook** | Guía **por escenario** de qué hacer ante un tipo de evento esperado o una alerta conocida. | "Hallazgo de GuardDuty por credenciales expuestas" |
| **Runbook** | Procedimiento **paso a paso** y, idealmente, **ejecutable** (automatizado) para una tarea concreta. | "Aislar una instancia EC2 comprometida" |

La guía de respuesta a incidentes de AWS recomienda preparar una **plantilla de playbook**, escribir playbooks para eventos de seguridad esperados y para alertas conocidas (como hallazgos de GuardDuty), y **simular incidentes de forma regular** para mejorar el programa con las lecciones aprendidas.

> **En el examen.** Un runbook **automatizado** (SSM Automation) es mejor que uno manual en un documento cuando la pregunta pide *rapidez, consistencia, auditoría o reducción de errores humanos*.

## Systems Manager OpsCenter

**OpsCenter** es el lugar central en Systems Manager para **ver, investigar y resolver elementos de trabajo operativos (OpsItems)** sobre recursos de AWS, con el objetivo de reducir el tiempo medio de resolución.

**Cómo se crean OpsItems:**

- **Alarmas de CloudWatch** pueden crear OpsItems automáticamente cuando entran en `ALARM`.
- **Reglas de EventBridge** los crean a partir de eventos de servicios de AWS (hallazgos de Security Hub, fallos de Automation, alertas de AWS Health...).
- **Security Hub** puede integrarse para agregar los problemas de seguridad junto con los operativos.
- **Manualmente** por consola, CLI, SDK o la API `CreateOpsItem`.

**Qué ofrece cada OpsItem:**

- **Runbooks de Automation sugeridos** para remediar problemas comunes; los ejecutas sobre el recurso afectado y OpsCenter conserva un registro de **30 días** de las ejecuciones.
- **Recursos relacionados** (hasta 100 ARN), con enlaces directos a detalles de algunos recursos (por ejemplo, EC2) y datos de **AWS Config** y **CloudTrail** como contexto.
- **Deduplicación** mediante recursos relacionados o una cadena de deduplicación en la regla de EventBridge.
- **Datos operativos**: pares clave-valor personalizados (logs, mensajes de error, notas). Los *searchable* los ve cualquiera con acceso a la descripción de OpsItems; los *private* solo quien puede llamar a `GetOpsItem`.

> **En el examen.** "Crear un ticket operativo automáticamente cuando salta una alarma o hallazgo y adjuntar un runbook para remediar" → **OpsCenter** (alarma o EventBridge → OpsItem → runbook de Automation).

## Notebooks de SageMaker AI como runbooks

La guía cita los **notebooks de SageMaker AI** como ejemplo de herramienta para respuesta a incidentes. La idea general es un **notebook (Jupyter)** que mezcla documentación y código ejecutable, de modo que un analista puede seguir el procedimiento y correr las consultas de investigación (por ejemplo, contra Athena o CloudTrail) paso a paso, con resultados reproducibles. La guía no pide más detalle del servicio; lo relevante para el examen es reconocer que **un notebook puede servir como runbook interactivo**.

## Qué debe incluir un buen runbook

1. **Disparador y alcance:** qué evento lo activa y qué recursos cubre.
2. **Pre-requisitos:** roles, accesos y herramientas necesarios (ya pre-aprovisionados).
3. **Pasos ordenados** de triage, contención, recolección de evidencia, erradicación y recuperación.
4. **Aprobaciones:** puntos donde un humano debe decidir (por ejemplo, la acción `aws:approve` de Automation).
5. **Verificación y rollback:** cómo confirmar el resultado y deshacer.
6. **Registro:** quién hizo qué y cuándo (CloudTrail, historial de Automation).

## Patrones de examen

1. **"Estandarizar la respuesta a un hallazgo recurrente de GuardDuty"** → playbook + runbook de SSM Automation disparado por EventBridge.
2. **"Centralizar los elementos de trabajo operativos y de seguridad con acciones de remediación"** → OpsCenter (con integración a Security Hub).
3. **"Respuesta repetible y auditable"** → runbook ejecutable con historial de ejecuciones.
4. **"Mejorar el plan con el tiempo"** → simulaciones periódicas y lecciones aprendidas.

## Referencias

- [AWS Systems Manager OpsCenter](https://docs.aws.eu/systems-manager/latest/userguide/OpsCenter.html)
- [Resumen de preparación (AWS Security Incident Response User Guide)](https://docs.aws.amazon.com/security-ir/latest/userguide/preparation-summary.html)
