## Idea central

CloudFront es mucho más que caché: es un **punto de control de seguridad** en el borde. Esta guía agrupa los controles que el examen espera que sepas elegir: contenido privado (**signed URLs / signed cookies**), protección del origen (**OAC**), restricciones geográficas, cifrado a nivel de campo, encabezados de seguridad y **CORS** en S3.

## Contenido privado: signed URLs vs signed cookies

| | **Signed URL** | **Signed cookie** |
|---|---|---|
| Alcance | Un archivo o ruta por URL | **Varios archivos** (sitio completo, playlist HLS) sin cambiar las URLs |
| Caso típico | Enlace de descarga, un video, enlace compartible | Área de miembros, streaming con muchos segmentos |
| Cambia las URLs | Sí | No |

Ambas validan la firma con las **claves públicas de un *trusted key group*** (método recomendado) o, de forma heredada, con *trusted signers* (pares de claves de cuentas AWS, incluida la raíz).

> **En el examen.** "Dar acceso temporal a un solo archivo" → signed URL. "Acceso a muchos archivos sin reescribir las URLs de la aplicación" → signed cookies. "Usar key groups" es la práctica recomendada frente a la cuenta raíz.

**Políticas (conocimiento general de CloudFront; verifícalo en la guía de desarrollador):**

| | Canned | Custom |
|---|---|---|
| Expiración | Sí | Sí |
| Fecha de inicio | No | Sí |
| Restricción por IP/CIDR | No | Sí |
| Comodines en la ruta | No | Sí |

Las URLs con política *canned* son más cortas; la política *custom* da control fino. Las signed cookies requieren política custom en los casos con comodines.

## Proteger el origen

Firmar URLs no sirve si el origen sigue siendo accesible directamente.

- **Origin Access Control (OAC)** para orígenes **S3**: CloudFront firma las solicitudes con **SigV4**; la bucket policy concede acceso al principal de servicio `cloudfront.amazonaws.com` condicionado al ARN de la distribución. OAC reemplaza al antiguo **OAI**. Soporta además SSE-KMS (el rol de la clave debe permitir al servicio CloudFront) y también orígenes de **Lambda function URL**.
- **Orígenes personalizados (ALB, EC2, on-premises):** encabezado personalizado secreto que el origen valida y/o security group que solo admite la prefix list de CloudFront; HTTPS entre CloudFront y el origen (política de protocolo del origen *HTTPS only*).
- **VPC origins:** CloudFront puede conectarse a orígenes en subredes privadas mediante *VPC origins* (valida su disponibilidad en la guía actual antes de usarlo como respuesta definitiva).

## Cifrado en tránsito hacia el viewer

- **Viewer protocol policy:** *Redirect HTTP to HTTPS* o *HTTPS only*.
- **Política de seguridad TLS** de la distribución: define versiones y cifrados mínimos aceptados; con dominio personalizado se usa un certificado de **ACM en us-east-1**.
- **Field-level encryption:** cifra campos específicos de un POST en el borde con una clave pública, de modo que solo el servicio de backend con la clave privada puede leerlos; protege datos sensibles (por ejemplo, tarjeta) incluso frente a componentes intermedios de la aplicación.

> **En el examen.** "Proteger un campo de formulario para que ni el servidor web intermedio lo vea" → **field-level encryption**, no solo TLS.

## Restricción geográfica y WAF

- **Geo restriction** (allowlist/denylist de países) en la configuración de la distribución.
- **WAF** asociada a CloudFront para reglas más finas (ver tema *AWS WAF*), incluidas huellas JA3/JA4; CloudFront añade el encabezado `CloudFront-Viewer-JA3-Fingerprint`.
- La web ACL de CloudFront se crea con scope `CLOUDFRONT` en **us-east-1**.

## Encabezados de seguridad: response headers policy

Una **response headers policy** agrega encabezados a las respuestas sin tocar el origen: `Strict-Transport-Security` (HSTS), `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, y encabezados **CORS**. Las políticas administradas por CloudFront cubren casos comunes; también puedes crear políticas propias.

> **En el examen.** "Aplicar HSTS/CSP a todas las respuestas sin modificar la aplicación" → response headers policy en el comportamiento (*cache behavior*).

## CORS en S3

**CORS** es un mecanismo del **navegador** que permite a una aplicación cargada desde un origen leer recursos de otro origen. En S3:

- La configuración CORS del bucket tiene reglas con `AllowedOrigins`, `AllowedMethods` y `AllowedHeaders` (además de `ExposeHeaders` y `MaxAgeSeconds`; estos dos no aparecían en la página consultada, confírmalos en la guía de S3).
- Ante una solicitud *preflight*, S3 usa la **primera regla CORS** que coincida con el origen, el método (`Access-Control-Request-Method`) y los encabezados (`Access-Control-Request-Headers`).
- **CORS no reemplaza el control de acceso:** las bucket policies y los permisos siguen aplicando. CORS no impide que un cliente que no sea navegador (curl) lea un objeto público.
- Con CloudFront delante de S3, para que el navegador reciba los encabezados CORS hay que **reenviarlos** (origin request policy / cache policy que incluya `Origin`) o agregarlos con una response headers policy.
- Error típico: usar `AllowedOrigins: *` junto con datos sensibles.

## Patrones de examen

1. **Contenido de pago accesible por tiempo limitado** → signed URL/cookie con key group.
2. **Bucket S3 solo vía CloudFront** → OAC + bucket policy, bloquear acceso público.
3. **Cifrar un campo del formulario hasta el backend** → field-level encryption.
4. **Agregar HSTS a todo** → response headers policy.
5. **Navegador bloquea llamada a S3 desde otro dominio** → configurar CORS en el bucket (y reenviar `Origin` si hay CloudFront).
6. **Migrar de OAI a OAC** → OAC es el recomendado, soporta SSE-KMS y todas las regiones.

## Referencias

- [Servir contenido privado con signed URLs y signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html)
- [Controles de identificación de clientes (huella JA3 en CloudFront)](https://docs.aws.amazon.com/prescriptive-guidance/latest/bot-control/client-identification-controls.html)
- [Cómo evalúa S3 una configuración CORS](https://docs.aws.eu/AmazonS3/latest/dev/cors.html)
