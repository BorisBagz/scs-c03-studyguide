## Idea central

Una **presigned URL** de S3 da acceso **temporal** a un objeto a quien no tiene credenciales de AWS, sin modificar la bucket policy. La URL incluye una firma generada con las credenciales de quien la creó. La documentación la describe como un **bearer token**: quien la posea, tiene el acceso.

> **En el examen.** "Permitir que un usuario externo descargue (o suba) un objeto durante 15 minutos sin darle credenciales" → presigned URL. Y recuerda la regla de oro: **la URL tiene los permisos de su creador y no puede durar más que las credenciales que la firmaron.**

## Quién puede crearlas y con qué permisos

- Cualquiera con credenciales válidas, **pero** debe tener permiso para la operación subyacente (por ejemplo, `s3:GetObject`): las capacidades de la URL son las del creador.
- Si se revocan, eliminan o desactivan las credenciales del creador, **la URL deja de funcionar**, aunque su expiración sea posterior.

## Expiración según el tipo de credencial

| Credencial usada para firmar | Duración máxima |
|---|---|
| **Usuario IAM** (SigV4) | Hasta **7 días** |
| **Consola de S3** | Entre **1 minuto y 12 horas** |
| **AWS CLI y SDK** | Hasta **7 días** |
| **Credenciales temporales** (rol, STS) | No puede exceder la vigencia de las credenciales |
| **Rol de instancia EC2** | Típicamente ~6 horas (la vigencia de las credenciales del rol) |

S3 comprueba la expiración al **iniciar** la solicitud: una descarga en curso puede terminar tras vencer, pero una reiniciada falla.

## Métodos y usos

- **GET:** descargar un objeto. **PUT:** subir un objeto (reemplaza el existente con la misma clave). **HEAD:** leer metadatos.
- La URL puede reutilizarse hasta que expire.
- Para cargas, SigV4 admite varios algoritmos de checksum.

## Cómo restringir su uso

- **`s3:signatureAge`** en una bucket policy o de access point para **denegar** firmas más antiguas que un valor (la documentación muestra un ejemplo de 10 minutos).
- **`aws:SourceIp`** (endpoint público) o **`aws:SourceVpc` / `aws:SourceVpce`** (endpoints de VPC) para limitar desde dónde se puede usar, aplicables en la política del principal, del bucket o ambas.
- **Mínimo privilegio** en el rol/usuario que firma, porque limita lo que cualquier URL puede hacer.
- Un **deny explícito** en la bucket policy sigue prevaleciendo sobre las capacidades de la URL.

## Errores comunes

| Síntoma | Causa probable |
|---|---|
| Expira antes de lo esperado | La credencial que firmó es temporal y venció |
| `403 Forbidden` | El creador no tiene permiso o hay un deny explícito en la bucket policy |
| `SignatureDoesNotMatch` | Reloj desincronizado, un proxy modificó encabezados, o el método/encabezados/query no coinciden exactamente |
| `ExpiredToken` | Renovar las credenciales antes de generar nuevas URLs |

## Presigned URL vs signed URL de CloudFront

| | **Presigned URL (S3)** | **Signed URL / cookie (CloudFront)** |
|---|---|---|
| Firma con | Credenciales IAM | Clave privada de un *key group* |
| Alcance | Un objeto de S3 | URL o patrón de rutas (cookies para varios archivos) |
| Revocación | Revocar credenciales del firmante | Quitar la clave del key group |
| Cuándo | Acceso puntual directo a S3 | Distribución de contenido privado a escala (ver tema *CloudFront*) |

## Patrones de examen

1. **App web permite subir archivos directo a S3 sin pasar por el servidor** → el backend genera presigned URL PUT de corta duración.
2. **Limitar presigned URLs a la VPC corporativa** → condición `aws:SourceVpce`/`aws:SourceIp`.
3. **Reducir la ventana de reutilización** → expiración corta + `s3:signatureAge`.
4. **Presigned URL firmada con rol de Lambda deja de funcionar a la hora** → vigencia de las credenciales del rol.
5. **Invalidar URLs ya emitidas** → revocar las credenciales del creador (p. ej., sesiones del rol).

## Referencias

- [Descargar y subir objetos con presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
