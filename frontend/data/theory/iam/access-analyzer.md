## Idea central

**IAM Access Analyzer** te ayuda a acercarte al **mínimo privilegio**: analiza, valida y genera permisos. Tiene varias funciones que el examen separa con cuidado:

| Función | Pregunta que responde |
|---|---|
| **External access analyzer** | ¿Qué recursos están compartidos con **públicos o con otras cuentas**? |
| **Internal access analyzer** | ¿Qué usuarios y roles **de mi organización** pueden acceder a mis recursos (S3, DynamoDB, RDS)? |
| **Unused access analyzer** | ¿Qué roles, claves, contraseñas, servicios y acciones **no se usan**? |
| **Policy validation** | ¿Mi política cumple las buenas prácticas de IAM? |
| **Custom policy checks** | ¿Esta política cambia el acceso frente a la versión anterior o infringe mi estándar? |
| **Policy generation** | ¿Qué permisos reales usa esta aplicación según **CloudTrail**? |

> **En el examen.** "Detectar buckets, roles o claves KMS accesibles desde fuera de la organización" → analizador de **acceso externo**. "Detectar permisos sin uso para recortarlos" → **acceso no utilizado**. "Crear una política de mínimo privilegio a partir de la actividad real" → **policy generation**. "Evitar en el pipeline que un cambio de política amplíe el acceso" → **custom policy checks**.

## Detalle de cada función

### Acceso externo

Monitorea de forma continua los permisos de los recursos y **alerta** cuando uno (por ejemplo, un bucket de S3) se vuelve accesible desde fuera: público o entre cuentas. El alcance del análisis (la "zona de confianza", cuenta u organización) se define al crear el analizador; la página de funciones consultada no lo detalla, confirma en la guía.

### Acceso interno

Muestra, en un panel unificado, qué principales de tu organización pueden acceder a recursos como S3, DynamoDB o RDS.

### Acceso no utilizado

Identifica **roles, claves de acceso y contraseñas** de usuarios IAM sin uso, y **servicios y acciones** sin usar en roles y usuarios activos, con recomendaciones de corrección.

### Policy validation

Comprueba las políticas contra las buenas prácticas con cuatro tipos de hallazgo: **advertencias de seguridad, errores, advertencias generales y sugerencias**.

### Custom policy checks

Valida políticas contra **tus estándares** antes de desplegar; marca los cambios **más permisivos** que la versión anterior. Se integra en **CI/CD** (por ejemplo, validando plantillas de CloudFormation). La página consultada no nombra las verificaciones concretas (hay verificaciones del tipo "sin nuevo acceso" y "acceso no concedido"; confirma los nombres en la documentación).

### Policy generation

Genera políticas granulares a partir de la actividad en **CloudTrail**, concediendo solo lo que la aplicación necesita.

### Último acceso (last accessed information)

Muestra cuándo se usaron servicios y acciones concedidos por las políticas de un rol o usuario, para eliminar lo que sobra.

## Integraciones

- Hallazgos de acceso externo y no utilizado → **Security Hub**.
- **EventBridge:** eventos cuando se generan, eliminan o actualizan hallazgos (debes crear la regla para recibirlos) → notificación o remediación automática.
- Con **Organizations**, un administrador delegado puede crear analizadores para toda la organización.

## Otras herramientas de IAM para auditar y probar

| Herramienta | Uso |
|---|---|
| **IAM Policy Simulator** | Probar el efecto de políticas (identidad, boundaries, y SCP con Organizations) sobre acciones y recursos concretos sin ejecutarlas |
| **Credential report** | Estado de contraseñas, MFA y claves (ver tema *MFA y credenciales*) |
| **Access advisor / último acceso** | Qué servicios usó una entidad y cuándo |
| **CloudTrail** | Qué ocurrió realmente; base para generar políticas |
| **AWS Config** | Reglas de cumplimiento (MFA, claves antiguas, políticas con `*`) |

## Flujo recomendado para reducir permisos

1. **Descubrir:** acceso externo (¿hay exposición?) y acceso no utilizado (¿qué sobra?).
2. **Generar:** policy generation para reemplazar políticas amplias por una a la medida.
3. **Validar:** policy validation y custom checks en el pipeline.
4. **Probar:** Policy Simulator.
5. **Desplegar y vigilar:** alertas con EventBridge/Security Hub.

## Patrones de examen

1. **Alertar cuando un bucket se haga público o se comparta con una cuenta externa** → Access Analyzer (acceso externo) + EventBridge.
2. **Eliminar usuarios/claves inactivas** → acceso no utilizado + remediación.
3. **Bloquear un PR que amplía permisos de IAM** → custom policy checks en CI/CD.
4. **La política de un rol es demasiado amplia y no se sabe qué usa** → generar política desde CloudTrail.
5. **Verificar si una política tiene errores de sintaxis o `Resource: "*"` innecesario** → policy validation.
6. **Probar el efecto de una SCP antes de aplicarla** → Policy Simulator (con Organizations).

## Referencias

- [Funciones de IAM Access Analyzer](https://aws.amazon.com/iam/access-analyzer/features/)
- [Credential reports](https://docs.aws.amazon.com/IAM/latest/UserGuide/credential-reports.html)
