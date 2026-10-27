## Qué es

**Amazon Macie** es un servicio de seguridad de datos que **descubre datos sensibles en Amazon S3** mediante machine learning y coincidencia de patrones, da visibilidad de los riesgos de seguridad de tus buckets y permite automatizar la protección. Trabaja sobre **buckets de propósito general de S3**.

> **En el examen.** Macie = **S3 + datos sensibles (PII, datos financieros, credenciales)**. Si la fuente no es S3, Macie no es la respuesta.

## Qué hace

1. **Inventario y evaluación de buckets.** Al habilitarlo, Macie mantiene un inventario de tus buckets y evalúa continuamente su seguridad y control de acceso (por ejemplo, si un bucket se vuelve **público** o se **comparte con otras cuentas**). Si detecta un problema genera un **hallazgo de política (policy finding)**.
2. **Descubrimiento de datos sensibles.** Si encuentra datos sensibles en un objeto genera un **hallazgo de datos sensibles (sensitive data finding)**.
3. **Estadísticas y panel.** Resumen de buckets públicos, compartidos, cifrado, etc.

| Tipo de hallazgo | Qué indica |
|---|---|
| **Policy finding** | Problema de seguridad o privacidad del **bucket** (acceso público, cifrado deshabilitado, compartido externamente). |
| **Sensitive data finding** | Datos sensibles detectados **dentro de un objeto**. |

## Dos formas de descubrir datos sensibles

| Modalidad | Características |
|---|---|
| **Automated sensitive data discovery** | Amplia y continua. Evalúa el inventario y usa **muestreo** para seleccionar objetos representativos. Da una visión general de dónde puede haber datos sensibles. |
| **Sensitive data discovery jobs** | Análisis **profundo y dirigido**: tú defines buckets, profundidad de muestreo y criterios basados en propiedades de los objetos. Puede ser **una sola vez** o **recurrente**. |

## Identificadores de datos

- **Managed data identifiers.** Criterios integrados (ML y patrones) para muchos tipos de PII, información financiera y credenciales, de varios países y regiones.
- **Custom data identifiers.** Los defines tú con una **expresión regular**, opcionalmente con secuencias de caracteres clave y una **regla de proximidad**, para detectar datos propios del negocio (códigos internos, propiedad intelectual).
- **Allow lists.** Texto o patrones que Macie debe **ignorar** (por ejemplo, teléfonos públicos de la empresa o datos de prueba), para reducir falsos positivos.

## Integraciones

- **EventBridge.** Macie publica los hallazgos como eventos; puedes enrutarlos a **Lambda** o **SNS** para notificar o remediar en casi tiempo real.
- **Security Hub.** Macie puede publicar hallazgos ahí para analizarlos junto con otros servicios y agregarlos entre regiones.
- **Multicuenta.** Con **AWS Organizations** (o invitaciones) designas un **administrador de Macie** que ve los buckets de las cuentas miembro, revisa sus hallazgos de política y ejecuta descubrimiento. Si las cuentas están en Organizations, el administrador también puede **habilitar Macie** en los miembros.

## Detalles que suelen aparecer en preguntas

- Macie es **regional**; se habilita en cada región.
- Incluye una **prueba gratuita de 30 días** al habilitarlo por primera vez en una región (los *jobs* de descubrimiento no entran en la prueba).
- Al analizar objetos cifrados con **SSE-KMS con llave administrada por el cliente**, Macie necesita permiso para usar esa llave y descifrarlos; esto implica costos adicionales de KMS.
- Es un servicio de **detección**: no cifra, no enmascara ni elimina datos. La remediación (aplicar políticas, mover el objeto, notificar al dueño) se automatiza con EventBridge.

## Patrones de examen

1. **"Encontrar PII en buckets S3"** → Macie (job de descubrimiento si es una revisión puntual o dirigida; descubrimiento automatizado si se quiere cobertura continua).
2. **"Detectar un identificador propio de la empresa"** → custom data identifier con regex.
3. **"Un bucket quedó público"** → policy finding de Macie (y, para bloquear a futuro, S3 Block Public Access).
4. **"Notificar al equipo cuando haya datos sensibles"** → EventBridge → SNS.
5. **"Macie en toda la organización"** → administrador delegado de Macie con Organizations.
6. **"Datos sensibles fuera de S3 (RDS, DynamoDB)"** → Macie no los analiza directamente.

## Referencias

- [Qué es Amazon Macie](https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html)
- [Ejecutar sensitive data discovery jobs](https://docs.aws.amazon.com/macie/latest/user/discovery-jobs.html)
- [Conceptos y terminología de Macie](https://docs.aws.amazon.com/macie/latest/user/macie-terms.html)
