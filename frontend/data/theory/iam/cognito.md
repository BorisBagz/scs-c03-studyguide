## Idea central

**Amazon Cognito** resuelve la identidad de los **usuarios de tus aplicaciones** (clientes finales). Tiene dos mitades que el examen distingue constantemente:

| | **User pool** | **Identity pool** |
|---|---|---|
| Función | **Directorio de usuarios** y proveedor de identidad (IdP OIDC) | Entrega **credenciales temporales de AWS** |
| Resultado | **Tokens JWT** (ID, access, refresh) | Credenciales de STS para llamar a servicios AWS (S3, DynamoDB...) |
| Pregunta que responde | "¿Quién eres?" (autenticación) | "¿A qué recursos de AWS puedes acceder?" (autorización de AWS) |

> **En el examen.** "Usuarios de una app móvil inician sesión y suben fotos directamente a S3" → user pool (autentica) + identity pool (credenciales con rol limitado). "Proteger un API de API Gateway con login de usuarios" → **authorizer de user pool** (o JWT authorizer) con los tokens.

## User pools

Desde la perspectiva de la aplicación, un user pool es un **IdP OIDC**.

### Registro (sign-up)

- Autoregistro por parte del usuario, creación por administradores, o importación (CSV, Lambda just-in-time).
- **Advertencia oficial:** si activas el autoregistro, **cualquiera en internet puede crear una cuenta**. Para apps cerradas desactívalo (`AllowAdminCreateUserOnly`).

### Inicio de sesión

- Usuario y contraseña, **passkeys**, códigos de un solo uso por correo o SMS.
- **Federación:** inicio de sesión social (Google, Facebook, Amazon, Apple vía OAuth 2.0) y proveedores **SAML 2.0 / OIDC** (cuentas corporativas). Cognito convierte las aserciones en perfiles del user pool según reglas de mapeo de atributos. Se pueden **vincular** perfiles externos con perfiles nativos.
- **Machine-to-machine:** un *app client* con **client credentials grant** emite tokens de acceso con *scopes* OAuth 2.0 (resource servers).
- **Managed login:** páginas alojadas por Cognito para registro, login, MFA y recuperación de contraseña (personalizables).

### Seguridad

- **MFA:** SMS, correo o aplicación TOTP; puede omitirse en dispositivos de confianza; puede ser obligatoria o **condicional**.
- **Autenticación adaptativa / threat protection:** detecta actividad potencialmente maliciosa y puede exigir MFA o **bloquear** el inicio de sesión. Las funciones avanzadas dependen del plan (*feature plan*) **Plus**, que también registra la actividad en S3, CloudWatch Logs o Firehose.
- **AWS WAF:** puedes asociar una web ACL a un user pool para monitorear y filtrar tráfico malicioso.
- **Lambda triggers:** modifican el flujo (rechazar altas, ajustar el ID token, desafíos de autenticación personalizados).
- **Grupos:** aparecen en los tokens y pueden vincularse a **roles IAM** al usar un identity pool.
- **Auditoría:** llamadas a la API en CloudTrail; métricas en CloudWatch.
- **Replicación multirregión** de user pools disponible (ver la guía vigente).

## Identity pools

Entregan **credenciales temporales de AWS** a usuarios autenticados (por un user pool, SAML, OIDC, proveedores sociales) e incluso **invitados** (no autenticados). Cada identidad asume un **rol IAM** (autenticado o invitado); se pueden asignar roles distintos por grupo o por reglas sobre los claims del token.

- **Mínimo privilegio:** el rol de invitados debe tener permisos casi nulos.
- Puedes usar **variables de política** como `${cognito-identity.amazonaws.com:sub}` para aislar los datos de cada usuario (por ejemplo, prefijo por usuario en S3 o clave de DynamoDB), y atributos como etiquetas de sesión para ABAC.

## Patrones de examen

1. **App web con login de clientes y federación con Google/Azure AD** → user pool con IdP federado.
2. **Cada usuario solo accede a su carpeta en S3** → identity pool + política con variable de identidad.
3. **Detectar credenciales comprometidas y bloquear inicios sospechosos** → threat protection (plan Plus).
4. **Proteger el endpoint de login contra bots** → WAF en el user pool.
5. **API de servicio a servicio con scopes** → client credentials en un app client.
6. **Evitar registros abiertos** → desactivar autoregistro.

## Referencias

- [Amazon Cognito user pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html)
