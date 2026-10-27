## Idea central

La tarea 3.3.5 pide **identificar y eliminar acceso de red innecesario** y **solucionar problemas de conectividad**. Hay tres herramientas que se confunden y el examen espera que las distingas:

| Herramienta | Pregunta que responde | Enfoque |
|---|---|---|
| **Network Access Analyzer** | "¿Existe **algún** camino de red que **no debería** existir?" | Auditoría de acceso no deseado |
| **VPC Reachability Analyzer** | "¿Puede **A** llegar a **B**? Si no, ¿qué lo bloquea?" | Diagnóstico de una ruta concreta |
| **Amazon Inspector (network reachability)** | "¿Qué puertos de mis instancias son **alcanzables desde fuera**?" | Exposición como parte del riesgo de vulnerabilidades |

> **En el examen.** "Demostrar que no hay rutas de internet hacia las instancias de la capa de datos" o "verificar segmentación" → **Network Access Analyzer**. "No puedo conectar la instancia A con la B, ¿por qué?" → **Reachability Analyzer**. "Priorizar vulnerabilidades según si el puerto es alcanzable desde internet" → **Inspector**.

## Network Access Analyzer

Característica de VPC que encuentra configuraciones de red que permiten acceso **no deseado**. Usa la misma tecnología de **razonamiento automatizado** que IAM Access Analyzer y Reachability Analyzer, y sirve para redes de cualquier tamaño.

- **Network Access Scope:** define, a alto nivel, la conectividad que **quieres** (o **no** quieres) entre recursos. Contiene `matchPaths` (orígenes y destinos por tipo de recurso, ID, IP, puerto o tipo de tráfico) y, opcionalmente, `excludePaths`.
- Puedes partir de **scopes creados por Amazon**, copiarlos y personalizarlos, o crear los tuyos con el constructor visual o con JSON (CLI/API).
- **Hallazgos:** cada uno muestra un **camino inesperado** entre recursos definidos en el scope, con los recursos intermedios resaltados. Puedes ajustar la configuración o el scope, **añadir rutas esperadas como exclusiones** y volver a ejecutar.
- Scope de Amazon **AWS-VPC-Ingress:** identifica rutas de entrada desde Internet Gateways, peering, servicios de endpoint de VPC, VPN y Transit Gateways.
- **Precio** (al lanzarse): 0.002 USD por ENI analizada.

Casos de uso típicos:

1. **Verificar segmentación:** que Finanzas y Desarrollo estén aislados.
2. **Comprobar uso del firewall:** que las apps web llegan a internet **solo** a través de un firewall.
3. **Detectar acceso involuntario a internet.**

## VPC Reachability Analyzer

- Analiza la **ruta lógica** entre dos puntos (origen y destino) en tu configuración y, si no es alcanzable, **identifica el componente** que bloquea (SG, NACL, tabla de rutas, gateway...). No envía tráfico real.
- Es la herramienta de **troubleshooting** puntual, no de auditoría de todo el entorno.
- La página consultada para este tema no describe las diferencias en detalle; la distinción anterior es la que se evalúa.

## Inspector y la alcanzabilidad de red

Inspector analiza la configuración de red para determinar si los puertos de una instancia son alcanzables y usa ese resultado como **factor ambiental** del *Inspector score* (ver tema *Amazon Inspector*). Un CVE en una instancia alcanzable desde internet pesa más.

## Otras fuentes de evidencia

| Fuente | Aporta |
|---|---|
| **VPC Flow Logs** | Qué tráfico se aceptó/rechazó realmente (ACCEPT/REJECT) |
| **Config** | Reglas para SG con `0.0.0.0/0`, subredes con IGW, recursos públicos |
| **Security Hub** | Controles de seguridad de red agregados |
| **Trusted Advisor** | Revisión de security groups con acceso sin restricciones (según el plan de soporte) |
| **GuardDuty** | Si el acceso innecesario ya está siendo explotado (escaneos de puertos, fuerza bruta) |

## Flujo de trabajo para reducir superficie

1. **Descubrir:** Network Access Analyzer (scopes de ingreso), Inspector (puertos alcanzables), Config.
2. **Priorizar:** ¿hay datos sensibles detrás? ¿explotabilidad real?
3. **Cerrar:** quitar reglas `0.0.0.0/0`, mover recursos a subredes privadas/aisladas, reemplazar bastiones por Session Manager, usar endpoints.
4. **Impedir regresión:** reglas de Config con remediación automática, políticas de Firewall Manager, SCP que bloqueen la creación de IGW o IPs públicas donde no corresponda.
5. **Demostrar:** volver a ejecutar el scope y guardar el resultado como evidencia de auditoría.

## Patrones de examen

1. **Auditar rutas inesperadas hacia la capa de base de datos** → Network Access Analyzer con un scope personalizado.
2. **Una instancia no puede alcanzar a otra** → Reachability Analyzer (y revisar SG, NACL, rutas).
3. **Detectar SG que abren 22/3389 al mundo y remediar** → regla de Config + remediación automática con SSM Automation.
4. **Ver qué instancias exponen puertos a internet junto a sus CVEs** → Inspector.
5. **Evitar nuevas IPs públicas no autorizadas** → SCP / política preventiva + Config detectiva.

## Referencias

- [Amazon VPC Network Access Analyzer (AWS News Blog)](https://aws.amazon.com/blogs/aws/new-amazon-vpc-network-access-analyzer)
- [Funciones de Amazon Inspector](https://aws.amazon.com/inspector/features/)
