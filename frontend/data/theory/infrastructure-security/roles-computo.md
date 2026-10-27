## Idea central

Las cargas de cómputo **no deben llevar claves de acceso estáticas**. Obtienen **credenciales temporales** mediante un rol: un *instance profile* en EC2, un *execution role* en Lambda/ECS, un *service role* para servicios que actúan en tu nombre. Tu trabajo en seguridad es asegurar el **mínimo privilegio** y **proteger el canal** por el que se entregan esas credenciales (IMDS).

## Qué rol para qué

| Mecanismo | Quién lo asume | Ejemplo |
|---|---|---|
| **Instance profile** | Una instancia EC2. Es el contenedor que asocia un rol IAM a la instancia. | App en EC2 lee un bucket S3. |
| **Execution role (Lambda)** | La función Lambda al ejecutarse. | Escribir logs en CloudWatch, leer DynamoDB. |
| **Task role / task execution role (ECS)** | El **task role** lo asume el código del contenedor; el **task execution role** lo usa el agente de ECS para extraer imagen y publicar logs. | Distinguir ambos es un clásico del examen. |
| **IAM Roles for Service Accounts (IRSA) / EKS Pod Identity** | Un pod de Kubernetes. | Dar a un pod permisos de S3 sin dar permisos al nodo. |
| **Service role** | Un servicio AWS (CloudFormation, CodeBuild, Config...) que actúa por ti. | Rol que CodeBuild asume para compilar. |
| **Service-linked role** | Rol predefinido y gestionado por el servicio. | Auto Scaling, Organizations. |

> **En el examen.** "La aplicación en EC2 necesita acceso a S3 sin almacenar credenciales" → rol IAM mediante instance profile. "El código de un contenedor ECS necesita DynamoDB" → **task role**, no el execution role. "Un pod necesita permisos distintos al resto del nodo" → IRSA / Pod Identity.

## Mínimo privilegio en el rol

- Acciones y recursos específicos; condiciones (`aws:SourceVpce`, `aws:RequestedRegion`, etiquetas).
- **Permission boundary** para limitar lo que un rol puede llegar a tener (útil cuando los desarrolladores crean roles).
- Revisar permisos no usados con **IAM Access Analyzer** (policy generation a partir de CloudTrail; hallazgos de acceso no utilizado).
- Si una instancia se compromete: no se "rota" el rol de instancia, se **revoca la sesión** (política de denegación con `aws:TokenIssueTime`) y se reemplaza la instancia.

## Instance Metadata Service (IMDS)

IMDS entrega a la instancia sus metadatos y las credenciales temporales del rol en `169.254.169.254`. Es el objetivo clásico de ataques **SSRF**.

| Opción | Valores | Nota |
|---|---|---|
| **`HttpTokens`** | `optional` (IMDSv1 o v2) · **`required`** (solo IMDSv2) | IMDSv2 exige un token de sesión obtenido por **PUT** (`/latest/api/token`). |
| **`HttpPutResponseHopLimit`** | 1–64 | Limita los saltos de la respuesta del token. Con **1** puede fallar en contenedores; **2** es lo habitual para contenedores en el host. |
| **`HttpEndpoint`** | enabled · disabled | Deshabilitado = nada puede leer los metadatos. |
| Acceso a etiquetas en metadatos | enabled · disabled | |

**Precedencia (de mayor a menor):** configuración al lanzar (launch template) → valores por defecto a nivel de cuenta (por región, solo nuevas instancias) → configuración de la AMI.

**Cómo hacerlo obligatorio:**

- **Enforcement a nivel de cuenta:** con IMDSv2 requerido, los lanzamientos que no lo cumplan fallan.
- **Condición IAM/SCP** sobre `ec2:RunInstances` para denegar si `HttpTokens` no es `required` (la clave de condición es `ec2:MetadataHttpTokens`; verifícala en la referencia de IAM). También se puede restringir `ec2:ModifyInstanceMetadataOptions` para que no la reviertan.
- **AWS Config** (regla administrada de IMDSv2) para detectar instancias que no cumplen.
- Cuidado: aplicaciones o agentes que usen IMDSv1 dejan de funcionar; en Windows se requiere PowerShell 4.0 o superior.

> **En el examen.** "Mitigar robo de credenciales por SSRF en EC2" → **exigir IMDSv2** (token por PUT, no reproducible por un SSRF simple) y mínimo privilegio en el rol.

## Patrones de examen

1. **Credenciales de aplicación en EC2** → instance profile, nunca claves en código/AMI.
2. **Impedir SSRF → credenciales** → IMDSv2 obligatorio (token + hop limit).
3. **Forzar IMDSv2 en toda la organización** → SCP con condición de metadatos + enforcement de cuenta + Config.
4. **Permisos por pod** → IRSA o EKS Pod Identity.
5. **Credenciales de instancia filtradas** → revocar sesiones del rol, aislar y reemplazar la instancia.

## Referencias

- [Opciones del Instance Metadata Service](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html)
