## Idea central

El **AWS Well-Architected Tool** es un servicio para **revisar cargas de trabajo** frente a las mejores prácticas del *AWS Well-Architected Framework* y obtener un plan de mejora. El examen lo incluye en la tarea 6.3 como herramienta de **evaluación de postura y riesgos** (no de detección técnica).

> **Nota de verificación.** No se pudo consultar la documentación oficial del servicio en esta sesión (las búsquedas devolvieron sobre todo contenido de terceros). Lo siguiente es el funcionamiento general conocido; confirma detalles en la guía oficial.

## Conceptos

| Concepto | Qué es |
|---|---|
| **Carga de trabajo (workload)** | Lo que se revisa; se define con cuentas, Regiones, entorno e industria |
| **Pilares** | Excelencia operativa, **Seguridad**, Confiabilidad, Eficiencia del rendimiento, Optimización de costos, Sostenibilidad |
| **Lente (lens)** | Conjunto de preguntas y buenas prácticas: el *AWS Well-Architected Framework* u otras especializadas (por ejemplo, de SaaS o Machine Learning); también hay lentes personalizadas |
| **Preguntas y respuestas** | Eliges las prácticas que ya aplicas; la herramienta calcula **riesgos** (alto/medio) |
| **Plan de mejora** | Lista priorizada con enlaces a guías |
| **Hito (milestone)** | Captura puntual de la revisión para **medir progreso** en el tiempo |
| **Compartir** | Con otras cuentas o la organización para colaborar |

## Pilar de Seguridad: áreas de las buenas prácticas

| Área | Idea |
|---|---|
| **Seguridad de la cuenta y de la organización** | Multi-cuenta, root protegido, controles preventivos |
| **Gestión de identidades y permisos** | Mínimo privilegio, credenciales temporales, federación |
| **Detección** | Logging, alertas, análisis |
| **Protección de la infraestructura** | Capas de red, endurecimiento |
| **Protección de datos** | Clasificación, cifrado en reposo y tránsito |
| **Respuesta a incidentes** | Preparación, simulacros, automatización |
| **Seguridad de la aplicación** | Seguridad en el ciclo de desarrollo |

(Los nombres de las áreas siguen la estructura habitual del pilar; el temario del examen no exige memorizar la numeración.)

## Cómo se usa en gobierno

1. **Revisión inicial** de cada carga de trabajo crítica (una por producto/entorno).
2. **Priorizar** los riesgos altos del pilar de Seguridad.
3. **Hitos** antes y después de las mejoras para demostrar avance.
4. Combinar con **Security Hub, Config y Trusted Advisor**, que dan señales técnicas automáticas; la Well-Architected Tool aporta la **revisión basada en preguntas** (autoevaluación).

## Qué NO es

- No escanea tus recursos automáticamente: **depende de tus respuestas** (algunas integraciones lo complementan).
- No impone controles: **recomienda**.
- No es un informe de cumplimiento regulatorio (para eso, Artifact/Audit Manager).

## Patrones de examen

1. **Evaluar si una carga de trabajo sigue buenas prácticas de AWS y obtener plan de mejora** → Well-Architected Tool.
2. **Medir cómo mejoró la postura después de remediar** → hitos (milestones).
3. **Revisión específica de una industria o tecnología** → lente especializada o personalizada.
4. **Detección automática de recursos mal configurados** → Config/Security Hub, no la Well-Architected Tool.
5. **El auditor pide el informe SOC de AWS** → Artifact (no la Well-Architected Tool).

## Referencias

- [AWS Well-Architected Tool (documentación)](https://docs.aws.amazon.com/wellarchitected/latest/userguide/intro.html)
- [Guía de gestión y gobierno de Well-Architected](https://docs.aws.amazon.com/wellarchitected/latest/management-and-governance-guide/controls.html)
