## Qué es

**Automated Forensics Orchestrator for Amazon EC2** es una solución de AWS que **orquesta de forma automática el proceso forense** desde el momento en que se detecta una amenaza: decide si aislar la instancia, adquiere **disco y memoria**, y lanza una investigación con herramientas forenses. Aparece de forma explícita en la habilidad 2.1.4 de la guía.

## Cómo funciona

1. **Detección.** Las fuentes (reglas de **AWS Config**, **GuardDuty** y herramientas de terceros) detectan actividad maliciosa en EC2 (por ejemplo, una instancia que consulta un dominio de baja reputación).
2. **Hallazgos a Security Hub** en la **cuenta de seguridad**.
3. **Disparador.** Por defecto, los hallazgos de Security Hub se envían a **EventBridge**, que entrega el ID de la instancia e inicia el flujo de **Step Functions**.
4. **Triage (Step Functions).** Obtiene información de la instancia, decide si hace falta **aislar** (según la acción de Security Hub) y si hace falta **adquirir** (según las **etiquetas** de la instancia). Guarda los detalles en **DynamoDB**.
5. **Adquisición en paralelo:**
   - **Flujo de memoria:** captura la memoria y la guarda en **S3**. Después **aísla** la instancia asociando un **security group nuevo** que elimina el acceso de usuarios, administradores y desarrolladores; esto ayuda a preservar la **cadena de custodia**.
   - **Flujo de disco:** crea un **snapshot de EBS** y lo **comparte con la cuenta forense**.
6. **Investigación (Step Functions + SSM).** Lanza una **instancia forense** desde una **AMI forense** preparada con las herramientas del cliente, carga la memoria desde S3, crea un volumen desde el snapshot y lo adjunta para análisis de disco. **Documentos de Systems Manager** ejecutan los scripts con **Run Command** (por ejemplo, construir líneas de tiempo).
7. **Reporte.** **SNS** comparte detalles de la investigación; **AppSync** permite consultar la línea de tiempo forense; **DynamoDB** guarda estados y resultados.

## Cuentas involucradas

| Cuenta | Rol |
|---|---|
| **Aplicación** | Aloja los recursos EC2 y ejecuta la detección (Config, GuardDuty, terceros). |
| **Seguridad** | Recibe los hallazgos en Security Hub; EventBridge los enruta al flujo. |
| **Forense** | Recibe los snapshots de EBS compartidos para analizarlos de forma aislada. |

## Puntos clave para el examen

- **Qué captura:** memoria (a S3) y disco (snapshot de EBS compartido con la cuenta forense).
- **Qué automatiza:** triage, adquisición, aislamiento e investigación.
- **Orden:** adquirir **antes** de aislar o apagar, porque la memoria volátil se pierde. En el flujo de memoria el aislamiento ocurre **después** de la captura.
- **Aislamiento:** reemplaza los security groups por uno restrictivo; ayuda a la cadena de custodia.
- **Requisitos de la AMI forense:** debe incluir el **SSM Agent**; puede construirse con **EC2 Image Builder**.
- **Los disparadores** son los hallazgos de Security Hub (que agregan GuardDuty y Config) y las **etiquetas** deciden si se adquiere.
- **Aislar la cuenta forense** del entorno afectado evita contaminar la evidencia y la posible propagación del atacante.

> **En el examen.** "Capturar automáticamente memoria y disco de una instancia comprometida, aislarla y analizarla en una cuenta separada" → **Automated Forensics Orchestrator** (Step Functions + EventBridge + Security Hub + SSM).

## Cuándo usarlo y alternativas

| Necesidad | Opción |
|---|---|
| Automatizar forense de EC2 a escala | Automated Forensics Orchestrator |
| Una sola instancia, manualmente | Pasos manuales (snapshots, herramienta de memoria, security group de aislamiento) |
| Escaneo de malware en volúmenes EBS tras un hallazgo | **GuardDuty Malware Protection for EC2** |
| Investigación de causa raíz entre recursos | **Amazon Detective** |

## Referencias

- [Arquitectura de Automated Forensics Orchestrator for Amazon EC2](https://docs.aws.amazon.com/solutions/latest/automated-forensics-orchestrator-for-amazon-ec2/architecture-overview.html)
