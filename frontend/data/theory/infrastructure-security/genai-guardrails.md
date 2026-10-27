## Idea central

Las aplicaciones de IA generativa añaden riesgos propios: **inyección de prompts**, fuga de datos sensibles, contenido dañino y alucinaciones. La tarea 3.2.7 pide saber implementar **guardrails** y alinearlos con el **OWASP Top 10 para aplicaciones LLM**. En AWS, la pieza central es **Amazon Bedrock Guardrails**.

## Amazon Bedrock Guardrails

Salvaguardas configurables que evalúan el **prompt de entrada** y la **respuesta del modelo** (los bloques de razonamiento no se evalúan). Un guardrail necesita al menos un filtro y mensajes de bloqueo (se pueden personalizar).

| Política | Qué hace | Acción |
|---|---|---|
| **Content filters** | Detecta contenido dañino en texto o imagen: *Hate, Insults, Sexual, Violence, Misconduct* y *Prompt Attack*, con intensidad configurable por categoría. | Bloquea. |
| **Prompt attacks** | Categoría de los content filters: jailbreaks, **prompt injection** y (solo nivel Standard) fuga de prompt. Aplica a entrada. | Bloquea. |
| **Denied topics** | Temas que defines como prohibidos para tu aplicación. | Bloquea. |
| **Word filters** | Palabras o frases exactas (competidores, groserías); incluye opción de lista de groserías. | Bloquea. |
| **Sensitive information filters** | PII en formatos estándar y **entidades personalizadas por regex**; filtro probabilístico basado en ML. | **Bloquea o enmascara**. |
| **Contextual grounding checks** | Detecta alucinaciones: respuestas no fundamentadas en la fuente o irrelevantes. Típico en **RAG**. | Bloquea o marca. |
| **Automated Reasoning checks** | Valida la salida contra reglas lógicas que defines. | Validación. |

**Niveles:** *Classic* y *Standard*; Standard extiende los content filters a elementos de código (comentarios, nombres, literales) y mejora el grounding y el soporte de idiomas.

### Cómo se usan

- **Con inferencia:** indicas ID y versión del guardrail en la llamada al modelo.
- **`ApplyGuardrail`:** evalúa contenido **sin invocar un modelo**, por lo que sirve también con modelos fuera de Bedrock o para validar texto en cualquier punto del flujo (`source`: INPUT u OUTPUT).
- **Etiquetado de secciones** (por ejemplo, separar instrucciones del sistema de la entrada del usuario) para evaluar solo lo que corresponde; solo vía SDK.
- **Borrador y versiones:** un guardrail tiene un *working draft* editable y versiones numeradas que se referencian en producción.

> **Ojo con los logs.** Si activas el registro de invocaciones de Bedrock, el contenido bloqueado puede aparecer en texto claro en los logs. Para evitarlo, se puede deshabilitar el registro de invocaciones. Protege esos logs con KMS y acceso restringido.

> **Nota de verificación.** La página consultada no describe los controles IAM para **exigir** un guardrail (p. ej. condiciones sobre el guardrail) ni la aplicación entre cuentas; ambos existen en la documentación de Guardrails ("Set up permissions" y "cross-account safeguards"). Revísalos antes de afirmarlos en una respuesta.

## OWASP Top 10 para LLM: mapeo de controles

(Resumen conceptual; la lista oficial se actualiza, consúltala en OWASP.)

| Riesgo | Control típico |
|---|---|
| **Prompt injection** | Content filter *Prompt Attack*, etiquetado de entrada del usuario, mínimo privilegio en las herramientas del agente. |
| **Divulgación de información sensible** | Sensitive information filters (enmascarar/bloquear PII), control de acceso a los datos de RAG, cifrado. |
| **Salida insegura** (el resultado se ejecuta o se renderiza sin validar) | Validar y sanear la salida; tratarla como entrada no confiable. |
| **Agencia excesiva** | Roles con mínimo privilegio para agentes, aprobación humana en acciones críticas. |
| **Alucinación / desinformación** | Contextual grounding, Automated Reasoning, RAG con fuentes confiables. |
| **Envenenamiento de datos / de la cadena de suministro** | Procedencia y control de acceso a los datos de entrenamiento y a los modelos; escaneo de dependencias. |
| **Consumo no acotado (DoS)** | Cuotas, límites de tokens y de tasa; **WAF rate-based** frente al API. |

## Seguridad de la aplicación alrededor del modelo

- Autenticación y autorización del cliente (Cognito, IAM, API Gateway); **WAF** delante del API (WAF puede asociarse a gateways de Bedrock AgentCore, según la referencia de la API).
- Datos en tránsito y en reposo cifrados (KMS); acceso privado con **VPC endpoints (PrivateLink)** a Bedrock.
- Registro y auditoría: CloudTrail, registros de invocación, métricas en CloudWatch.

## Patrones de examen

1. **Impedir que el chatbot trate un tema (p. ej., asesoría legal)** → *denied topics*.
2. **Evitar que la respuesta incluya números de tarjeta o emails** → *sensitive information filters* (enmascarar o bloquear).
3. **Detectar intentos de jailbreak/prompt injection** → content filter *Prompt Attack*.
4. **Reducir alucinaciones en un RAG** → *contextual grounding checks*.
5. **Proteger una app que usa un modelo externo a Bedrock** → `ApplyGuardrail`.
6. **El contenido bloqueado aparece en los logs** → deshabilitar o proteger el registro de invocaciones.

## Referencias

- [Componentes de un guardrail](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-components.html)
- [Detectar y filtrar contenido dañino con Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
- [Referencia de la API: WebACL (recursos asociables)](https://docs.aws.amazon.com/waf/latest/APIReference/API_WebACL.html)
