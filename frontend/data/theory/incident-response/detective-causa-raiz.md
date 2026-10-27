## Qué es

**Amazon Detective** ayuda a **investigar** actividad sospechosa y hallar su **causa raíz**. Organiza datos de varias fuentes en un **grafo de comportamiento (behavior graph)** y usa machine learning para construir líneas base, de modo que puedes responder preguntas como *¿es normal que este rol haga esta llamada?* sin escribir consultas. Es el ejemplo que cita la guía para la habilidad **2.2.5** (*describir métodos para realizar análisis de causa raíz*).

> **En el examen.** **GuardDuty detecta; Detective investiga.** Si la pregunta es "determinar el origen y el alcance de un hallazgo" o "visualizar las relaciones entre IP, instancia y usuario", la respuesta es Detective.

## Datos de origen

Detective procesa copias estructuradas de:

- **Logs de servicios de AWS**, como **CloudTrail** y **VPC Flow Logs**.
- **Hallazgos de GuardDuty**.

No necesitas desplegar agentes ni sensores, y no afecta el costo ni el rendimiento de tu infraestructura. Es un servicio **regional**; los datos se procesan en la región donde se generan. Conserva el análisis y resúmenes de logs en el grafo durante **un año móvil** desde la ingesta (según el anuncio del servicio); al deshabilitarlo se eliminan los datos.

## Conceptos

| Concepto | Descripción |
|---|---|
| **Behavior graph** | Conjunto de datos vinculados que Detective construye; todos los grafos comparten la misma estructura de hallazgos, entidades y relaciones. |
| **Entidad** | Un elemento extraído de los datos: una dirección IP, una instancia EC2, un usuario de AWS. |
| **Relación** | Actividad entre entidades, con tipo y dirección (una IP que se conecta a una instancia). |
| **Hallazgo** | Un problema de seguridad detectado por GuardDuty. |
| **Finding group** | Agrupa hallazgos, entidades y evidencia que pueden pertenecer al **mismo evento**; los genera un modelo de ML integrado. |
| **Evidencia** | Contexto adicional de los **45 días** anteriores (nuevas geolocalizaciones, llamadas de API nuevas), con severidad *Informational*; solo visible en Detective. |
| **Perfil de entidad** | Página con visualizaciones (tablas, líneas de tiempo, mapas) para decidir si la actividad es real o un falso positivo. |
| **Scope time** | Ventana de tiempo de los datos: por defecto, de la primera a la última observación del hallazgo, o las últimas 24 horas para un perfil. |
| **Investigación** | Proceso de triage, determinación de alcance, causa y decisión de qué hacer. |

## Cómo se usa en una investigación

1. **Entrar desde un hallazgo:** en GuardDuty o Security Hub, usar *Investigate* abre Detective con el contexto.
2. **Ver el resumen del hallazgo** y las entidades involucradas.
3. **Pivotar** a perfiles de entidad (IP, rol, instancia, usuario) para comparar el comportamiento actual con la **línea base**.
4. **Revisar el finding group** para ver si es parte de un ataque más amplio.
5. **Ajustar el scope time** para ver lo anterior y posterior.
6. **Determinar la causa raíz:** cómo entró el actor (credenciales filtradas, vulnerabilidad, mala configuración), qué recursos tocó y qué hizo.

## Multicuenta

- La **cuenta administradora** posee el grafo, invita a las cuentas miembro y puede ver el uso de datos y eliminar miembros.
- Una **cuenta miembro** aporta datos; si fue invitada, puede aceptar, rechazar o retirarse, y solo ve la información de uso de su cuenta.
- En **AWS Organizations**, la cuenta de administración designa una **cuenta administradora de Detective** (organization behavior graph); las cuentas de la organización **no pueden retirarse** por su cuenta.

## Análisis de causa raíz (RCA): método

El examen espera que sepas *cómo* llegar a la causa, no solo qué herramienta usar:

1. **Línea de tiempo:** reconstruye qué ocurrió primero (CloudTrail, Detective, flow logs).
2. **Punto de entrada:** ¿credenciales expuestas, vulnerabilidad sin parchear (Inspector), bucket o security group abierto (Config), phishing?
3. **Movimiento lateral y persistencia:** nuevos usuarios, claves, roles, funciones o reglas.
4. **Impacto:** datos accedidos o exfiltrados (CloudTrail data events, Macie, flow logs).
5. **Causa subyacente:** la brecha de control (falta de MFA, permisos excesivos, configuración sin monitoreo).
6. **Acciones correctivas y lecciones aprendidas:** cerrar la brecha, mejorar detección, actualizar playbooks.

## Detective frente a otros servicios

| Servicio | Pregunta que responde |
|---|---|
| **GuardDuty** | ¿Hay actividad maliciosa? |
| **Security Hub** | ¿Qué debo priorizar? |
| **Detective** | ¿Cómo ocurrió, qué abarcó y es normal? |
| **CloudTrail / Athena** | ¿Qué llamadas exactas se hicieron? |
| **Inspector** | ¿Había una vulnerabilidad explotable? |

## Patrones de examen

1. **"Visualizar la secuencia de eventos y las entidades relacionadas con un hallazgo de GuardDuty"** → Detective.
2. **"Determinar si una IP ya había interactuado con el entorno antes"** → perfil de entidad de la IP en Detective.
3. **"Ver todos los hallazgos relacionados con el mismo ataque"** → finding groups.
4. **"Habilitar Detective para toda la organización"** → administrador delegado de Detective con Organizations.
5. **"Detective no muestra datos antiguos"** → la retención es un año móvil y los datos empiezan desde que se habilitó.

## Referencias

- [Conceptos de Amazon Detective](https://docs.aws.amazon.com/detective/latest/userguide/detective-terms-concepts.html)
- [Amazon Detective: investigación y análisis rápidos de seguridad (blog de AWS)](https://aws.amazon.com/blogs/aws/amazon-detective-rapid-security-investigation-and-analysis)
