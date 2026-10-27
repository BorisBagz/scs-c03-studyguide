## Idea central

"Shift left": detectar vulnerabilidades **antes** de desplegar. La tarea 3.2.6 pide saber **integrar escaneo de seguridad en el pipeline** de CI/CD y en el IDE, con herramientas de AWS como **Amazon Q Developer** y **Amazon CodeGuru Security**.

> **Nota de verificación.** El artículo de AWS que pude consultar es de noviembre de 2023 y describe **CodeWhisperer** (hoy integrado en Amazon Q Developer) y CodeGuru Security. No pude confirmar el estado actual (disponibilidad, posible cierre a nuevos clientes) de CodeGuru Security; revisa la documentación vigente. Amazon Inspector sigue usando escaneo de código para Lambda.

## Dónde escanear en el ciclo de vida

| Etapa | Qué se revisa | Herramientas |
|---|---|---|
| **IDE** | Código mientras se escribe | Amazon Q Developer (escaneo de seguridad en el IDE; antes CodeWhisperer). |
| **Commit / PR** | Código fuente (SAST), secretos | CodeGuru Security (integración con GitHub/GitLab/Bitbucket), escáneres de terceros. |
| **Build** | Dependencias, imágenes de contenedor | CodeBuild + escaneo; Amazon ECR con Inspector. |
| **Infraestructura como código** | Plantillas CloudFormation/Terraform | CloudFormation Guard, cfn-lint (ver Dominio 6). |
| **Despliegue / runtime** | Instancias, contenedores, Lambda | Inspector, Config, GuardDuty. |

## CodeGuru Security

- Herramienta de **análisis estático (SAST)** con machine learning para detectar vulnerabilidades y violaciones de políticas de seguridad (también hay hallazgos de eficiencia).
- Detecta, por ejemplo, **credenciales en el código**, **XSS** y **fugas de recursos**.
- Escaneo **manual** (subir un .zip de hasta 5 GB) o **automático** desde un pipeline.
- Integración con **CodePipeline**: una plantilla de CloudFormation crea un proyecto de CodeBuild que ejecuta el análisis, y se añade como acción en una etapa. También se integra con repositorios GitHub y GitLab.
- Los hallazgos incluyen recomendaciones de corrección.

## Amazon Q Developer (IDE)

- Asistente de desarrollo con **escaneo de seguridad** del proyecto en el IDE, que señala por ejemplo credenciales sin cifrar escritas en logs (según el artículo, soportaba Python, Java y JavaScript en su momento).
- Útil como primera línea, previa al commit.

## Amazon Inspector en el pipeline

- Escanea **imágenes de contenedor** (ECR y herramientas de CI/CD) y **código de Lambda** (apoyado en CodeGuru Security).
- Los hallazgos van a EventBridge: la respuesta puede **detener un despliegue** o abrir un ticket.

## Controles complementarios

- **Gestión de secretos:** no confirmar secretos en el repositorio; usar Secrets Manager y escaneo de secretos.
- **Roles de pipeline de mínimo privilegio** y aprobaciones manuales antes de producción.
- **Artefactos firmados** (AWS Signer para código de Lambda: ver Dominio 5) y repositorios de artefactos privados.
- **Puertas de calidad (quality gates):** fallar el build si hay hallazgos de severidad alta.

## Patrones de examen

1. **Encontrar credenciales hardcodeadas y XSS antes de producción** → análisis estático (CodeGuru Security) en el pipeline.
2. **Feedback al desarrollador mientras escribe código** → escaneo de seguridad en el IDE (Amazon Q Developer).
3. **Bloquear un build con vulnerabilidades críticas** → paso de escaneo en CodeBuild/CodePipeline con umbral de severidad.
4. **Imágenes de contenedor vulnerables** → Inspector sobre ECR y en CI/CD.
5. **Plantillas IaC inseguras** → CloudFormation Guard / cfn-lint en el pipeline.

## Referencias

- [Automatiza y mejora la seguridad del código con servicios con IA (AWS Security Blog)](https://aws.amazon.com/blogs/security/automate-and-enhance-your-code-security-with-ai-powered-services/)
- [Funciones de Amazon Inspector](https://aws.amazon.com/inspector/features/)
