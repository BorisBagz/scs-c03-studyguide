## Idea central

La administración remota de instancias es una de las superficies de ataque más comunes (SSH/RDP abiertos a internet). El examen espera que sepas reemplazar los bastiones y las claves SSH estáticas por mecanismos **autenticados con IAM, auditables y sin puertos entrantes**: **Systems Manager Session Manager** y **EC2 Instance Connect**.

## Systems Manager Session Manager

Da una shell interactiva (o PowerShell) o reenvío de puertos a nodos administrados **sin abrir puertos entrantes, sin bastión y sin claves SSH**. La conexión la inicia el **SSM Agent** de la instancia hacia los endpoints de Systems Manager (saliente por HTTPS).

| Aspecto | Detalle |
|---|---|
| **Autenticación y autorización** | IAM: el usuario necesita permisos como `ssm:StartSession` sobre el recurso (instancias por ID o por **etiqueta**). Los permisos pueden limitarse con condiciones (por ejemplo, etiquetas de la instancia o el documento de sesión). |
| **Rol de la instancia** | La instancia necesita un instance profile con permisos de SSM (por ejemplo, la política administrada para el agente). |
| **Red** | Salida a los endpoints de SSM; en subredes privadas sin NAT, **VPC endpoints** de interfaz para `ssm`, `ssmmessages` y `ec2messages` (valida la lista vigente en la guía). |
| **Auditoría** | Cada sesión queda en **CloudTrail** (inicio y fin). El contenido de la sesión se registra opcionalmente en **CloudWatch Logs** o **S3** (cifrable con KMS). |
| **Cifrado de la sesión** | Los datos van sobre TLS; se puede añadir cifrado adicional con una **clave KMS** en las preferencias de Session Manager. |
| **Sin acceso de red directo** | No requiere IP pública ni entradas en el security group. |
| **Port forwarding** | Reenvía un puerto local a uno remoto (por ejemplo, a una base de datos RDS detrás de la instancia) por la misma vía autenticada. |
| **Preferencias** | Tiempo de inactividad, usuario del SO (`ssm-user` o *run as*), y registro. |

> **En el examen.** "Acceder a instancias en subred privada sin bastión ni puertos abiertos, con registro de comandos" → **Session Manager** con logging a CloudWatch Logs/S3. "Auditar quién abrió sesión" → CloudTrail; "ver qué comandos escribió" → logs de sesión.

## EC2 Instance Connect

Permite conectar por **SSH** (y desde la consola) usando una **clave pública temporal** inyectada por la API en lugar de una clave permanente.

- La API `SendSSHPublicKey` empuja una clave pública a la instancia para un usuario del SO; la clave **permanece 60 segundos**, y debes tener la clave privada correspondiente.
- La autorización se controla con **IAM** (permiso `ec2-instance-connect:SendSSHPublicKey`, restringible por instancia, usuario del SO, etiquetas).
- Requiere que la instancia tenga el paquete de EC2 Instance Connect (viene en Amazon Linux y Ubuntu recientes) y que el puerto 22 sea alcanzable desde el origen.
- Para instancias **sin IP pública**, existe el **EC2 Instance Connect Endpoint**, que permite SSH/RDP a instancias privadas sin bastión ni IP pública (confirma detalles de costo y permisos en la guía vigente).
- Auditoría en CloudTrail (llamadas a `SendSSHPublicKey`).

> **Nota de verificación.** Los detalles de Session Manager de esta sección provienen de conocimiento general del servicio; no pude contrastarlos con la página oficial en esta pasada. Confirma permisos exactos y endpoints en la guía de Systems Manager antes de usarlos como regla.

## Cuándo usar cada uno

| Necesidad | Elección |
|---|---|
| Sin puertos abiertos, registro completo de sesión, también Windows | **Session Manager** |
| SSH nativo con claves efímeras y control IAM | **EC2 Instance Connect** |
| Instancia privada, SSH sin bastión, sin SSM Agent | **EC2 Instance Connect Endpoint** |
| Evitar claves SSH compartidas de larga duración | Cualquiera de los anteriores |

## Buenas prácticas

- **Cerrar** los puertos 22/3389 a `0.0.0.0/0` (Config tiene reglas para detectarlo; Security Hub también).
- Eliminar los key pairs compartidos; si quedan, controlar acceso por IAM.
- Acceso **justo a tiempo** y con MFA para roles de administración.
- Alertar sobre sesiones a instancias críticas con EventBridge sobre eventos de CloudTrail.
- Para políticas de lo que puede hacer un administrador dentro de la sesión, usar **documentos de sesión** personalizados y mínimo privilegio.

## Patrones de examen

1. **Eliminar bastiones y claves SSH** → Session Manager.
2. **Registrar todo lo que se teclea** → logging de Session Manager a CloudWatch Logs/S3 con KMS.
3. **Limitar quién accede a qué instancias** → política IAM con condición por etiqueta.
4. **SSH efímero sin gestionar claves** → EC2 Instance Connect.
5. **Subred privada sin NAT** → VPC endpoints de SSM.

## Referencias

- [`SendSSHPublicKey` (API de EC2 Instance Connect)](https://docs.aws.amazon.com/ec2-instance-connect/latest/APIReference/API_SendSSHPublicKey.html)
