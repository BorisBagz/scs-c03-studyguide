## Idea central

La habilidad 2.1.2 pide **usar características de los servicios de AWS para estar preparado antes de un incidente**: aprovisionar el acceso, desplegar herramientas de seguridad, **minimizar el radio de impacto (blast radius)** y configurar protecciones como **Shield Advanced**. La preparación es la fase donde se gana o pierde la respuesta.

## Personas y procesos

- **Roles y responsabilidades:** define a los involucrados y una matriz **RACI**.
- **Capacitación en AWS** para el equipo de respuesta (servicios de seguridad, monitoreo y la arquitectura propia).
- **Conocer las opciones de soporte de AWS:** AWS Support, el **Customer Incident Response Team (CIRT)**, el **DDoS Response Team (DRT)** y AWS Managed Services, y la ruta de escalamiento para contactarlos durante un evento activo.
- **Plan, playbooks y simulaciones** (ver el tema anterior).
- **Documentar y centralizar diagramas de arquitectura** (estructura de cuentas, uso de servicios, patrones de IAM).

## Tecnología: estructura de cuentas y acceso

**Estructura de cuentas** recomendada por la guía de respuesta a incidentes:

- Una **OU de Seguridad** con una **cuenta de herramientas de seguridad** (security tooling) y una **cuenta de archivo de logs** (log archive).
- Una **OU de Forense** con una **cuenta forense** por cada región en la que operas.
- **Aislamiento entre cuentas** para limitar el radio de impacto: un incidente en una cuenta de carga de trabajo no debería comprometer logs ni herramientas de seguridad.

**Prepara el acceso de los respondedores** y pruébalo antes de necesitarlo:

- Define qué acceso necesitan, impleméntalo (roles entre cuentas con **IAM Identity Center** o roles de IAM de respuesta a incidentes), **pruébalo y monitorealo** (alertas cuando se asuma).
- Aplica **mínimo privilegio**: acceso de solo lectura y de investigación por separado de las acciones de contención.
- Define un procedimiento de **acceso de emergencia (break-glass)** y vigila su uso.
- Verifica la **información de contacto de cada cuenta**, con listas de distribución de correo para evitar puntos únicos de falla y protege esos buzones.

**Estrategia de etiquetado (tags):** para identificar dueño y contexto de los recursos durante la respuesta, e incluso disparar automatizaciones (por ejemplo, una etiqueta `Status=Quarantine`).

## Tecnología: herramientas y logs

- **Habilita logs** para investigaciones: CloudTrail (organization trail), VPC Flow Logs, DNS, WAF, ELB, logs de aplicación; define retención y cómo consultarlos.
- **Despliega con antelación** los servicios de detección y análisis: **GuardDuty**, **Security Hub**, **Detective** (necesita datos históricos para dar contexto), **Macie**, **Config**, **Inspector**.
- **Capacidades forenses preparadas:** qué artefactos recolectar, una **AMI forense** con herramientas, una cuenta forense aislada, automatización de la adquisición.
- **Modelo de amenazas** e inteligencia de amenazas para priorizar.

## Minimizar el radio de impacto (blast radius)

| Control | Cómo reduce el impacto |
|---|---|
| **Multicuenta** | Cada carga de trabajo o entorno en su cuenta; una brecha no se propaga automáticamente. |
| **SCP / permission boundaries** | Techo de permisos que limita lo que un atacante puede hacer aun con credenciales válidas. |
| **Mínimo privilegio en roles** | Un rol comprometido solo accede a lo imprescindible. |
| **Segmentación de red** | Subredes, security groups y NACL que limitan el movimiento lateral. |
| **Credenciales temporales** | Reducen la ventana de uso de credenciales robadas (STS en lugar de claves de larga duración). |
| **Cifrado con llaves separadas por entorno** | Limita qué datos puede descifrar un atacante. |
| **Backups aislados** | Copias en otra cuenta/región con **Backup Vault Lock** para sobrevivir a ransomware. |

## AWS Shield Advanced

**Shield Advanced** es la protección ampliada contra **DDoS** para recursos como CloudFront, Route 53, Elastic Load Balancing, Global Accelerator y direcciones IP elásticas. Capacidades relevantes:

- **Shield Response Team (SRT):** puedes contactarlo en cualquier momento durante un ataque que afecte la disponibilidad y trabajar con ellos en mitigaciones personalizadas. **Requiere plan de soporte Business o Enterprise.**
- **Proactive engagement:** el SRT te contacta directamente si un **health check de Route 53** asociado al recurso protegido se vuelve no saludable durante un evento detectado. Requiere **health-based detection** habilitada.
- **Health-based detection:** usa health checks de Route 53 para mejorar la detección, reducir falsos positivos y acelerar la mitigación.
- **Mitigación automática en capa de aplicación (L7):** aplica límites de tasa de **AWS WAF** a orígenes de DDoS conocidos y crea/gestiona reglas de WAF personalizadas durante el ataque; puedes ponerlo en modo `count` o `block`. Al habilitarla se agrega un grupo de reglas de **150 WCU** al web ACL.
- **Protección de costos (cost protection):** créditos de servicio por picos de factura causados por un DDoS, incluidos ciertos cargos de transferencia de salida.
- **Visibilidad:** métricas y reportes en tiempo real por API, consola y CloudWatch.
- **Integración con Firewall Manager:** aplica Shield Advanced automáticamente a cuentas y recursos nuevos y despliega reglas de WAF; las políticas de protección de Shield Advanced no tienen cargo adicional de Firewall Manager.

> **Distinción.** **Shield Standard** viene incluido sin costo para todos los clientes (protección L3/L4 básica). **Shield Advanced** es de pago y añade SRT, protección L7 automática y protección de costos.

## Patrones de examen

1. **"Los respondedores deben poder actuar rápido en cualquier cuenta"** → roles de respuesta entre cuentas preaprovisionados y probados, con acceso monitoreado.
2. **"Preservar evidencia aunque la cuenta de la carga de trabajo se comprometa"** → logs en cuenta de archivo, forense en cuenta aislada.
3. **"Limitar el daño de credenciales comprometidas"** → mínimo privilegio, SCP, credenciales temporales y segmentación multicuenta.
4. **"Soporte de AWS para mitigar un DDoS complejo"** → Shield Advanced + SRT (con Business/Enterprise Support).
5. **"Evitar una factura inesperada por un ataque DDoS"** → cost protection de Shield Advanced.
6. **"Aplicar Shield Advanced a todas las cuentas nuevas"** → Firewall Manager.

## Referencias

- [Resumen de preparación (AWS Security Incident Response User Guide)](https://docs.aws.amazon.com/security-ir/latest/userguide/preparation-summary.html)
- [Capacidades de Shield Advanced](https://docs.aws.amazon.com/waf/latest/developerguide/ddos-advanced-summary-capabilities.html)
