## Idea central

**AWS Secrets Manager** almacena, controla el acceso y **rota** secretos (credenciales de bases de datos, claves de API, tokens). Elimina secretos escritos en código o variables de entorno. La tarea 5.3 del examen lo combina con KMS y rotación.

> **En el examen.** "Rotar automáticamente credenciales de RDS sin cambiar la aplicación" → **Secrets Manager con rotación**. "Guardar configuración y secretos simples sin rotación y de menor costo" → **Systems Manager Parameter Store** (SecureString).

## Rotación (cómo funciona)

La rotación la ejecuta una **función Lambda** con cuatro pasos:

| Paso | Qué hace |
|---|---|
| `createSecret` | Crea la nueva versión del secreto con la credencial nueva (etiqueta **AWSPENDING**) |
| `setSecret` | Cambia la credencial en la base de datos o servicio |
| `testSecret` | Verifica que la versión pendiente funciona |
| `finishSecret` | Mueve la etiqueta **AWSCURRENT** a la nueva versión (la anterior pasa a **AWSPREVIOUS**) |

Etiquetas de versión: **AWSCURRENT** (la activa), **AWSPENDING** (en rotación), **AWSPREVIOUS** (la anterior).

Estrategias y buenas prácticas verificadas:

- **Usuario único** vs. **usuarios alternos** (*alternating users*): la segunda clona un usuario para que siempre haya uno válido durante la rotación; evita fallos de las aplicaciones que cachean credenciales.
- La Lambda de rotación debe tener acceso de red al servicio rotado (VPC y endpoint de Secrets Manager).
- Las aplicaciones deben leer el secreto **en tiempo de ejecución** (con caché y reintentos), no embeberlo.
- Con **alta concurrencia**, usar *provisioned concurrency* (≥10) en la Lambda de rotación.
- Plantillas de rotación gestionadas para **RDS, Aurora, DocumentDB, Redshift**, etc.

## Seguridad del secreto

| Control | Detalle |
|---|---|
| **Cifrado** | Siempre con KMS; clave AWS managed (`aws/secretsmanager`) o **customer managed** (necesaria para compartir entre cuentas) |
| **Política de recursos** | Permite acceso entre cuentas y restringe por condiciones |
| **IAM** | `secretsmanager:GetSecretValue` mínimo; condiciones de etiquetas (ABAC) |
| **Replicación multi-Region** | Réplicas del secreto en otras Regiones para recuperación |
| **Auditoría** | CloudTrail registra cada acceso |
| **Eliminación** | Ventana de recuperación configurable antes de borrar |

> **Nota de verificación.** Replicación multi-Region, política de recursos y ventana de recuperación se resumen de conocimiento general; los pasos de rotación, etiquetas y mejores prácticas sí se verificaron en la documentación de AWS.

## Secrets Manager vs. Parameter Store

> **Nota de verificación.** Comparación de conocimiento general, no contrastada en esta sesión.

| | **Secrets Manager** | **Parameter Store** |
|---|---|---|
| Rotación nativa | **Sí** | No |
| Costo | Por secreto y por llamada | Estándar gratuito; avanzados de pago |
| Cifrado | Siempre KMS | Opcional (SecureString) |
| Replicación entre Regiones | Sí | No nativa |
| Uso típico | Credenciales con rotación | Configuración, valores simples |

## Patrones de examen

1. **Eliminar contraseñas de DB embebidas y rotarlas cada 30 días** → Secrets Manager + rotación Lambda.
2. **La rotación causa errores en la aplicación** → usuarios alternos; la app debe volver a leer el secreto.
3. **Compartir un secreto con otra cuenta** → clave KMS customer managed + política de recursos.
4. **Función Lambda necesita un secreto** → rol de ejecución con `GetSecretValue`; **no** variables de entorno en claro.
5. **Detectar secretos sin rotación** → regla de Config `secretsmanager-rotation-enabled-check`.

## Referencias

- [Rotación de secretos en Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [Mejores prácticas de Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
