## Qué es

**Amazon Inspector** es el servicio de **gestión de vulnerabilidades** de AWS: descubre y escanea recursos de forma **continua** y genera hallazgos con una puntuación de riesgo. Cubre tres tipos de recurso, además de repositorios de código y herramientas de CI/CD para imágenes de contenedor:

| Recurso | Qué escanea |
|---|---|
| **EC2** | Vulnerabilidades de software (CVE) y exposición de red. Usa el **SSM Agent** para recolectar inventario; para instancias sin SSM Agent hay **escaneo sin agente** mediante snapshots de EBS. |
| **ECR (imágenes de contenedor)** | Vulnerabilidades en los paquetes de las imágenes, al subirlas y de forma continua. |
| **Lambda** | Dependencias de las funciones y capas y, con **Lambda code scanning**, el código propio (inyección, fugas de datos, criptografía débil, falta de cifrado). Sugiere correcciones y puede generar parches. |

> **En el examen.** "Detectar CVEs en instancias, imágenes y funciones, de forma continua y sin ejecutar escaneos manuales" → Inspector. Si una instancia no aparece escaneada, la causa típica es que **no está administrada por Systems Manager** (sin SSM Agent o sin rol/permisos), salvo que se use escaneo sin agente.

## Inspector score y riesgo contextual

El **Inspector score** combina los datos de la CVE con factores del entorno como la **alcanzabilidad de red** y la explotabilidad, para ofrecer un riesgo **contextualizado** (el desglose se ve en el detalle del hallazgo). Un CVE crítico en una instancia sin ruta desde internet puede puntuar menos que uno moderado expuesto.

## Network reachability

Analiza si los puertos de una instancia son **alcanzables desde el exterior** (internet gateway, peering, VPN, etc.) examinando la configuración de red (security groups, NACLs, tablas de ruta, gateways) sin enviar tráfico. Encaja con la tarea 3.3.5 (acceso innecesario) junto con **Network Access Analyzer** (ver tema *Acceso innecesario a la red*).

## Otras capacidades

- **SBOM export:** inventario consolidado de software exportado a S3 en formatos estándar; consultable con Athena y QuickSight.
- **CIS scans:** evaluaciones bajo demanda o programadas contra benchmarks CIS (niveles 1 y 2) en EC2.
- **Integraciones:** hallazgos a **Security Hub** y **EventBridge** (flujos de remediación o tickets).
- **Multicuenta:** administrador delegado de Organizations que habilita y consolida los hallazgos de las cuentas miembro.
- Los hallazgos cerrados se conservan 30 días (según el artículo de blog de AWS consultado; confirma el valor vigente).

## Inspector vs GuardDuty Runtime Monitoring

| | **Inspector** | **GuardDuty Runtime Monitoring** |
|---|---|---|
| Pregunta | ¿Qué **vulnerabilidades** tiene el recurso? | ¿Qué **amenazas están ocurriendo** ahora? |
| Enfoque | Postura (preventivo) | Detección de comportamiento (EKS, EC2, ECS/Fargate) |
| Datos | Inventario de paquetes, código, red | Eventos del SO: procesos, archivos, conexiones |

Se complementan: Inspector reduce la superficie explotable; GuardDuty detecta la explotación. Ambos envían hallazgos a Security Hub.

## Patrones de examen

1. **Escaneo continuo de imágenes al hacer push** → ECR + Inspector (mejorado) y regla de EventBridge ante hallazgos críticos.
2. **Bloquear despliegue con vulnerabilidades críticas** → escaneo en pipeline (CI/CD) y/o regla EventBridge que dispare remediación o detenga el despliegue.
3. **Priorizar parches** → Inspector score + alcanzabilidad.
4. **Instancias sin SSM Agent** → agentless scanning, o instalar SSM Agent y rol.
5. **Toda la organización** → administrador delegado.

## Referencias

- [Funciones de Amazon Inspector](https://aws.amazon.com/inspector/features/)
- [Automatiza y mejora la seguridad del código con servicios con IA (AWS Security Blog)](https://aws.amazon.com/blogs/security/automate-and-enhance-your-code-security-with-ai-powered-services/)
