## Idea central

**AWS Firewall Manager** administra y aplica reglas de firewall y protección de red **de forma centralizada** en todas las cuentas y recursos de una organización. Cuando se incorpora una cuenta o un recurso nuevo, la política se le aplica automáticamente.

> **En el examen.** "Garantizar que todos los ALB de la organización tengan un web ACL con ciertas reglas, incluso en cuentas nuevas" → **Firewall Manager con política de WAF**. "Auditar y corregir grupos de seguridad que abren SSH a internet en todas las cuentas" → **política de grupos de seguridad** (auditoría/uso).

## Tipos de política (verificado)

| Política | Qué aplica |
|---|---|
| **AWS WAF / WAF Classic** | Web ACL (o una regla agrupada en Classic) a los recursos protegidos |
| **Shield Advanced** | Protecciones DDoS en los tipos de recurso indicados |
| **Grupos de seguridad de VPC** | Controla los SG en uso y aplica un **conjunto base** de reglas |
| **ACL de red de VPC** | Controla las NACL y aplica una base |
| **Network Firewall** | Protección en las VPC de la organización |
| **Route 53 Resolver DNS Firewall** | Protección DNS en las VPC |
| **Firewall de terceros** | Marketplace (p. ej., Palo Alto Cloud NGFW, Fortigate CNF) |

Cada política es de **un solo tipo**; para varios tipos se crean varias políticas.

## Requisitos (FAQ de AWS)

- Cuentas en una organización con **all features**.
- Una **cuenta administradora** de Firewall Manager (la de administración o una miembro con los permisos necesarios).
- **AWS Config habilitado** en cada cuenta miembro.
- **AWS RAM** (opcional): solo para configurar de forma centralizada Network Firewall o DNS Firewall entre cuentas/VPC.

## Alcance y remediación

- Cada política tiene un **alcance**: cuentas/OU incluidas o excluidas y **etiquetas de recurso**.
- **Remediación automática:** vigila la deriva y aplica las reglas a recursos no conformes. **Modo manual:** crea las reglas en cada cuenta sin imponerlas; puedes cambiar a automático luego.
- Monitorea cuentas y recursos nuevos para que cumplan las reglas obligatorias **desde su creación**.
- Una política abarca hasta **2 500 cuentas**; las políticas son **regionales** (una por Región; las de CloudFront/WAF global se crean en us-east-1).

> **Nota de verificación.** La excepción de CloudFront en us-east-1 es práctica general; el resto de datos de esta sección proviene de las páginas oficiales consultadas.

## Relación con otros servicios

| Servicio | Relación |
|---|---|
| **WAF, Shield, Network Firewall** | Firewall Manager los despliega y gobierna a escala (ver temas de Dominio 3) |
| **Config** | Requisito: detecta cumplimiento y deriva |
| **Security Hub** | Recibe los hallazgos de no conformidad |
| **Organizations / RAM** | Alcance por organización; compartir reglas |

## Patrones de examen

1. **Aplicar las mismas reglas de WAF a todas las cuentas y a las nuevas** → Firewall Manager (WAF).
2. **Un equipo abrió 0.0.0.0/0 en un SG** → política de SG con remediación automática.
3. **Firewall Manager no aplica nada en una cuenta** → falta Config habilitado o la cuenta no está en el alcance.
4. **Quiero Network Firewall en todas las VPC marcadas con `env=prod`** → política Network Firewall con alcance por etiqueta (y RAM).
5. **Mantener cumplimiento de DDoS en todos los ALB/CloudFront** → política de Shield Advanced.

## Referencias

- [Políticas de Firewall Manager](https://docs.aws.amazon.com/waf/latest/developerguide/working-with-policies)
- [Preguntas frecuentes de Firewall Manager](https://aws.amazon.com/firewall-manager/faqs)
