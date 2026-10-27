## Qué es

**AWS WAF** es un firewall de aplicaciones web (L7) que inspecciona solicitudes HTTP(S) y decide qué hacer con ellas según reglas. La consola actual usa el término **protection pack** para lo que la API sigue llamando **web ACL**; en el examen y en la API verás *web ACL*.

> **En el examen.** WAF **no** protege contra DDoS volumétrico de red (eso es Shield) ni inspecciona tráfico que no sea HTTP(S). Sí es la respuesta para SQLi, XSS, bots, scraping, geobloqueo y limitación de tasa.

## Anatomía de una web ACL

| Elemento | Qué es |
|---|---|
| **Web ACL** | Contenedor de reglas asociado a uno o más recursos. Tiene una **acción por defecto** (allow o block) para lo que no coincide con ninguna regla. |
| **Regla** | Una *statement* (qué buscar) + una *acción* (qué hacer) + prioridad. Se evalúan **en orden de prioridad**. |
| **Rule group** | Conjunto reutilizable de reglas: propio (capacidad fija al crearlo), **administrado por AWS** o de **proveedores del Marketplace**. |
| **WCU** | *Web ACL capacity units*: costo de procesamiento de reglas. Las reglas simples consumen menos que las complejas. |
| **Labels** | Etiquetas que una regla agrega a la solicitud para que reglas posteriores la evalúen. |

### Acciones de regla

| Acción | ¿Terminante? | Comportamiento |
|---|---|---|
| **Allow** | Sí | Reenvía la solicitud al recurso. Puede insertar encabezados personalizados. |
| **Block** | Sí | Bloquea; por defecto responde **403**. La respuesta se puede personalizar. |
| **Count** | No | Cuenta sin permitir ni bloquear y **sigue evaluando**. Puede añadir etiquetas y encabezados. Ideal para probar una regla antes de bloquear. |
| **CAPTCHA** | Depende del token | Con token válido se comporta como Count; con token inválido o vencido bloquea y presenta un puzzle. |
| **Challenge** | Depende del token | Igual que CAPTCHA pero con un reto silencioso en JavaScript, sin intervención humana. |

CAPTCHA y Challenge solo funcionan con navegadores en **HTTPS** y en contextos seguros, y tienen **costo adicional**. El tiempo que un token sigue siendo válido es el *immunity time*.

> **En el examen.** "Probar una regla nueva sin afectar usuarios" → acción **Count** (o *rule action override* a Count en un rule group) y revisar logs. "Distinguir navegadores reales de scripts sin molestar al usuario" → **Challenge**. "Confirmar que es humano en un formulario sensible" → **CAPTCHA**.

## Tipos de statement

| Statement | Uso |
|---|---|
| **ByteMatch / RegexMatch / RegexPatternSet** | Buscar cadenas o patrones en URI, encabezados, query string, cuerpo, cookies. |
| **SizeConstraint** | Comparar tamaño de un componente (por ejemplo, cuerpos anormalmente grandes). |
| **SqliMatch / XssMatch** | Detectar SQL malicioso y cross-site scripting. |
| **GeoMatch** | Coincide por país (y región). Etiqueta cada solicitud con país/región. |
| **IPSetReference** | Lista de IPs/CIDR; al actualizar el set se actualizan todas las reglas que lo usan. |
| **AsnMatch** | Coincide por número de sistema autónomo (ASN) de la IP. |
| **LabelMatch** | Evalúa etiquetas añadidas por reglas anteriores. |
| **ManagedRuleGroup / RuleGroupReference** | Ejecutar un grupo de reglas completo. Deben ser *statements* de nivel superior. |
| **RateBased** | Limitar la tasa de solicitudes por clave de agregación. |
| **And / Or / Not** | Combinar statements. |

**Restricciones de anidamiento:** una `RateBasedStatement` **no** se puede anidar dentro de And/Or/Not; y `ManagedRuleGroupStatement`/`RuleGroupReferenceStatement` no se anidan ni se usan dentro de otro rule group.

## Reglas basadas en tasa (rate-based)

- Cuentan solicitudes por **clave de agregación**: IP, IP reenviada (`X-Forwarded-For`), método HTTP, query argument, cookie, **huella JA3/JA4**, o **combinaciones** (por ejemplo IP + método). Cada combinación única se cuenta por separado.
- Un **scope-down statement** limita qué solicitudes se cuentan (por ejemplo, solo `/login`).
- Con agregación solo por IP, `GetRateBasedStatementManagedKeys` lista las IP actualmente limitadas.
- Cambiar la configuración de una regla activa **reinicia sus contadores**; cada web ACL o rule group que la use tiene su propia instancia de conteo.
- Detrás de CloudFront o un proxy, agrega por **IP reenviada**, no por la IP de origen, o limitarás al propio CDN.

> **En el examen.** "Mitigar fuerza bruta/scraping/DoS L7 desde pocas fuentes" → regla rate-based con scope-down a la ruta sensible. "Atacante rota IPs pero tiene el mismo cliente" → agregar por **huella JA3/JA4** o usar Bot Control.

## Bloqueo geográfico y por origen

- **GeoMatch** (país) dentro de una regla Block o con `Not` para "permitir solo estos países".
- En CloudFront también existe **geo restriction** a nivel de distribución (allowlist/denylist de países), sin WAF; WAF ofrece más granularidad (combinar con ruta, método, etiquetas).
- La geolocalización por IP **no es infalible**: VPN y proxies la evaden. Úsala como control de reducción de superficie, no como autenticación.

## Grupos de reglas administradas por AWS

| Categoría | Grupos |
|---|---|
| **Baseline** | *Core rule set (CRS)* (OWASP Top 10 y vulnerabilidades generales), *Admin protection* (páginas administrativas expuestas), *Known bad inputs* (patrones de explotación conocidos). |
| **Casos de uso** | SQL database, Linux OS, POSIX OS, Windows OS, PHP application, WordPress application. |
| **Reputación de IP** | *Amazon IP reputation list*, *Anonymous IP list* (VPN, proxies, nodos Tor, hosting). |
| **Control de fraude y bots** | **Bot Control**, **ATP** (Account Takeover Prevention), **ACFP** (Account Creation Fraud Prevention). |
| **DDoS** | Grupo de reglas de prevención de DDoS distribuido. |

Todos soportan **etiquetado**; `DescribeManagedRuleGroup` lista las etiquetas disponibles. Puedes sobrescribir la acción de reglas individuales (por ejemplo, pasar una a **Count**) para afinar falsos positivos.

> **En el examen.** "Proteger contra OWASP Top 10 con el menor esfuerzo" → **Core rule set** (más SQL database si hay base de datos). "Bloquear solicitudes desde VPN/proxies anónimos" → **Anonymous IP list**. "Credential stuffing en el login" → **ATP**. "Registros falsos de cuentas" → **ACFP**.

## Bots y huellas de cliente

- **Bot Control** tiene dos niveles de protección: **common** (señales de bots autoidentificados por firma y comportamiento) y **targeted** (detección avanzada con tokens y análisis de comportamiento). El nivel *targeted* usa los SDK de JavaScript/móvil de WAF.
- **Tokens:** el SDK recopila datos del cliente; WAF evalúa si ejecuta JavaScript o si es la app legítima. Los **TokenDomains** definen qué dominios aceptan el token (por defecto solo el dominio del recurso).
- **Huellas TLS:** WAF soporta **JA3 y JA4** (hash del *Client Hello* de TLS). JA4 como *match statement* aplica a **CloudFront y ALB**; JA3/JA4 como clave de agregación en reglas rate-based. CloudFront también envía el encabezado `CloudFront-Viewer-JA3-Fingerprint` (se puede reenviar al origen con una origin request policy).
- **Device fingerprinting y browser profiling** (vía tokens) permiten límites por dispositivo, más eficaces que por IP contra bots que rotan proxies.

## Logging, visibilidad y datos

- Destinos de logs de la web ACL: **CloudWatch Logs**, **S3** o **Amazon Data Firehose**. Los nombres de log group/bucket/stream deben empezar por `aws-waf-logs-` (verifica el prefijo exacto al configurarlo).
- Puedes **redactar campos** del log (por ejemplo, encabezados con credenciales) y filtrar qué se registra. Esa configuración **solo afecta los logs**; para excluir campos también del muestreo y de **Security Lake** se usa **data protection** de la web ACL.
- **Request sampling:** muestra de solicitudes evaluadas en la consola para ver qué regla las capturó.
- **Amazon Security Lake** puede recolectar datos de la web ACL y normalizarlos a **OCSF**; AWS WAF no cobra por esa opción (sí Security Lake).
- Métricas por regla en **CloudWatch** (`VisibilityConfig`).

## Gobierno y reglas de terceros

- **AWS Firewall Manager** despliega web ACLs y rule groups en toda la organización y las ejecuta antes/después de tus reglas (*PreProcess/PostProcess*); solo Firewall Manager puede modificarlas.
- **AWS Marketplace:** grupos de reglas de proveedores de seguridad (F5, Fortinet, etc.) que se suscriben y se añaden como cualquier managed rule group.
- **AWS WAF Security Automations** (solución de AWS) implementa reglas basadas en logs y listas de reputación.

## Límites y costos a recordar

- Tamaño de cuerpo inspeccionado por defecto: **16 KB** (CloudFront, API Gateway, Cognito, App Runner, Verified Access); **8 KB** fijo en ALB y AppSync. Aumentarlo cuesta más.
- Precio (verificado): **$5 por web ACL/mes, $1 por regla/mes** (más $1 por rule group) y **$0.60 por millón de solicitudes**; sin capa gratuita general.

## Patrones de examen

1. **Probar reglas sin impacto** → Count + logs + sampled requests.
2. **Permitir solo ciertos países** → GeoMatch con Not + Block, o geo restriction en CloudFront.
3. **Limitar intentos de login** → rate-based con scope-down a la URI de login, agregando por IP reenviada.
4. **Bloquear ataques conocidos con mínimo esfuerzo** → managed rule groups (CRS, Known bad inputs).
5. **Falsos positivos de una regla gestionada** → override de acción a Count para esa regla (no quitar el grupo).
6. **Auditar qué bloqueó WAF** → logging a S3/CloudWatch/Firehose; análisis con Athena o Security Lake.
7. **Una política WAF común en 100 cuentas** → Firewall Manager.

## Referencias

- [Statements de reglas (API)](https://docs.aws.amazon.com/waf/latest/APIReference/API_Statement.html)
- [Acciones de reglas](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-action.html)
- [WebACL (API)](https://docs.aws.amazon.com/waf/latest/APIReference/API_WebACL.html)
- [Logging de web ACL](https://docs.aws.amazon.com/waf/latest/developerguide/logging.html)
- [Lista de grupos de reglas administradas por AWS](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html)
- [Controles de identificación de clientes (Bot Control)](https://docs.aws.amazon.com/prescriptive-guidance/latest/bot-control/client-identification-controls.html)
- [JA4 y agregación JA3/JA4 en reglas rate-based](https://aws.amazon.com/about-aws/whats-new/2025/03/aws-waf-ja4-fingerprinting-aggregation-ja3-ja4-fingerprints-rate-based-rules/)
