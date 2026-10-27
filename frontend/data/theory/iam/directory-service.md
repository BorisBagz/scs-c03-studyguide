## Idea central

**AWS Directory Service** ofrece directorios compatibles con Active Directory (AD) para que cargas de trabajo en AWS (EC2 unidas al dominio, RDS for SQL Server, WorkSpaces, IAM Identity Center...) usen identidades de dominio. Se elige entre tres opciones según **dónde vive la fuente de verdad** y **qué tan completa** debe ser la compatibilidad con AD.

| Opción | Qué es | Cuándo |
|---|---|---|
| **AWS Managed Microsoft AD** | Directorio Microsoft AD real, administrado por AWS, con controladores de dominio propios en tu VPC. Soporta **relaciones de confianza (trusts)** con AD on-premises. | Compatibilidad total con AD, más de 5 000 usuarios, o necesidad de una confianza entre un directorio en AWS y los on-premises. |
| **AD Connector** | Conecta tu **AD on-premises existente** con AWS para que los servicios de AWS lo usen. | Quieres usar el directorio on-premises tal cual, sin crear uno en AWS. |
| **Simple AD** | Directorio de bajo costo con compatibilidad básica de AD, para **hasta 5 000 usuarios**. | Necesidades simples. (La documentación consultada lo presenta como la opción económica; confirma su disponibilidad vigente antes de recomendarla.) |

> **En el examen.** "Usar las credenciales del AD corporativo para que WorkSpaces/Identity Center autentiquen, sin replicar el directorio" → **AD Connector**. "Directorio AD en AWS con confianza hacia el on-premises" → **AWS Managed Microsoft AD** con trust.

## AD Connector: puntos clave

- Es un **conector** hacia tu directorio on-premises; la autenticación ocurre en tus controladores de dominio.
- **Requisitos de red:** VPC asociada configurada; si tu AD define **sitios**, las subredes de la VPC del conector deben estar definidas en un sitio sin conflictos (AD Connector usa los rangos del sitio para encontrar controladores de dominio; un solape puede enviarlo a controladores lejanos).
- AWS administra el **security group** del directorio: se puede modificar pero no se recomienda.
- **Buenas prácticas:** un conector por dominio on-premises (incluidos dominios hijos), cada uno con su propia cuenta de servicio; **rotar** la contraseña de la cuenta de servicio con regularidad; pruebas de carga y varios conectores si se necesita más capacidad.
- Los nombres de usuario para aplicaciones como WorkSpaces o WorkDocs no pueden contener espacios, caracteres multibyte ni la mayoría de caracteres especiales (el `@` solo antes del sufijo UPN).

## Integraciones relevantes para seguridad

- **IAM Identity Center** puede usar AWS Managed Microsoft AD (o AD Connector) como fuente de identidad; en administración delegada, el directorio debe estar en la cuenta del administrador delegado (ver tema *IAM Identity Center*).
- **Unir EC2 al dominio** (Systems Manager, unión automática) para autenticación con credenciales de AD.
- **Acceso a la consola de AWS** con usuarios de AD mediante roles IAM asignados a grupos del directorio (en la práctica, usando Identity Center).
- **Client VPN** puede autenticar contra Active Directory (ver tema *Conectividad híbrida*).
- MFA para usuarios del directorio: Managed Microsoft AD admite MFA mediante RADIUS (confirma la configuración en la guía de administración).

> **Nota de verificación.** La documentación oficial que pude recuperar describe AD Connector con detalle; la comparación de las tres opciones, trusts y MFA con RADIUS proviene en parte de conocimiento general. Contrástalo con la guía de administración de Directory Service.

## Patrones de examen

1. **Usuarios corporativos acceden a WorkSpaces con sus credenciales de AD, sin directorio nuevo** → AD Connector.
2. **AD en AWS que confía en el AD on-premises (trust)** → Managed Microsoft AD.
3. **Identity Center con AD como fuente** → directorio en la cuenta del administrador delegado si se delega.
4. **Rotación de credenciales del conector** → rotar la contraseña de la cuenta de servicio.

## Referencias

- [Buenas prácticas de AD Connector](https://docs.aws.eu/directoryservice/latest/admin-guide/ad_connector_best_practices.html)
- [Administración delegada en IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/delegated-admin.html)
