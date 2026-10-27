## Idea central

Dos servicios apoyan el **cumplimiento y las auditorías**, con propósitos distintos:

| | **AWS Audit Manager** | **AWS Artifact** |
|---|---|---|
| Qué es | Recolecta **evidencia de tu uso de AWS** para auditorías | Portal de autoservicio con **informes de cumplimiento de AWS** y **acuerdos** |
| Pregunta que responde | "¿Cómo demuestro que **mis** controles funcionan?" | "¿Cómo demuestro que **AWS** cumple (SOC, ISO, PCI) y firmo un BAA?" |

> **En el examen.** "Descargar el informe SOC 2 o ISO 27001 de AWS para el auditor" → **Artifact**. "Recolectar evidencia automáticamente de mis controles y generar un informe de auditoría" → **Audit Manager**.

## AWS Audit Manager (verificado)

> **Importante.** La documentación indica que el servicio **ya no está abierto a nuevos clientes** (los existentes pueden seguir usándolo). Puede aparecer como concepto, pero no como recomendación para proyectos nuevos.

| Elemento | Detalle |
|---|---|
| **Frameworks** | Prediseñados para CIS, PCI DSS, GDPR, HIPAA, SOC 2, GxP y buenas prácticas operativas de AWS; también **personalizados** (compartibles con otra cuenta o replicables a otra Región) |
| **Controles** | Estándar, personalizados desde cero o copiados y editados; se asocian a **fuentes de datos** |
| **Evaluaciones (assessments)** | Se crean desde un framework con las cuentas en alcance; recolección **continua** hasta que se marca como inactiva |
| **Evidencia automatizada** | Datos del entorno AWS transformados a evidencia |
| **Evidencia manual** | Cargas desde on-premises o multicloud, y respuestas a cuestionarios de riesgo de controles personalizados |
| **Fuentes de datos** | **Security Hub CSPM**, **CloudTrail** (actividad de usuarios), **Config**, y también License Manager, Control Tower, Artifact, EventBridge |
| **Buscador de evidencia** | Consultas; genera informe o exporta a CSV |
| **Informes de evaluación** | Resumen de evidencia con enlaces a carpetas de detalle |
| **Integridad** | Evidencia almacenada de forma que no se altere |

**Aclaración oficial:** Audit Manager **ayuda a recoger evidencia**, pero **no evalúa el cumplimiento** por sí mismo ni sustituye a asesores legales o de cumplimiento.

## AWS Artifact (verificado)

| Función | Detalle |
|---|---|
| **Informes** | Descarga de certificaciones ISO, informes PCI y SOC como evidencia de auditoría; algunos incluyen guía de responsabilidad para planear tus controles |
| **Acuerdos** | Revisar, aceptar, rastrear y terminar acuerdos como el **BAA de HIPAA**; hay que aceptar el **NDA de Artifact** antes de descargar documentos confidenciales |
| **Acuerdos de cuenta vs. de organización** | Los de cuenta cubren solo la cuenta que firma; los de **organización** (aceptados por la cuenta de administración) cubren **todas las cuentas actuales y futuras**; el de organización activo tiene prioridad |
| **Acceso IAM** | Root y administradores descargan todo tras aceptar términos; otros usuarios necesitan permisos como `artifact:DownloadAgreement` o `artifact:AcceptAgreement`; para auditores, crea credenciales **limitadas a los informes relevantes** |
| **Informes de terceros** | Solo con acceso a AWS Marketplace Vendor Insights para ese proveedor |
| **Notificaciones** | Alertas de nuevos informes/acuerdos mediante AWS User Notifications (hasta 20 correos verificados por configuración) |

Recomendación de la SRA: en la cuenta de administración, restringe a los usuarios de Artifact **solo a Agreements**; el acceso de auditores a informes se da desde la cuenta de seguridad.

## Modelo de responsabilidad compartida

Artifact evidencia lo que **AWS** hace (seguridad *de* la nube); tú debes demostrar tus controles (seguridad *en* la nube) con Config, Security Hub, CloudTrail y, si está disponible, Audit Manager.

## Patrones de examen

1. **El auditor pide el SOC report de AWS** → Artifact.
2. **Aceptar el BAA de HIPAA una vez para toda la organización** → acuerdo de organización desde la cuenta de administración.
3. **Evidencia automática de CIS para el trimestre** → Audit Manager (si disponible) o Security Hub + Config + exportaciones.
4. **Auditor externo con acceso mínimo** → IAM limitado a informes concretos de Artifact.
5. **Evidencia no alterable** → almacenada de forma inmutable (ver *Inmutabilidad de datos*).

## Referencias

- [Qué es AWS Audit Manager](https://docs.aws.amazon.com/audit-manager/latest/userguide/what-is.html)
- [Preguntas frecuentes de AWS Artifact](https://aws.amazon.com/ru/artifact/faq/)
