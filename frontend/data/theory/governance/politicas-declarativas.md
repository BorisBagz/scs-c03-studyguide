## Idea central

Las **políticas declarativas** definen y hacen cumplir la **configuración base de un servicio de AWS** en toda la organización (raíz, OU o cuentas). A diferencia de SCP/RCP, **no gobiernan permisos de API**: se aplican en el **plano de control del servicio**.

| | **SCP** | **RCP** | **Declarativas** |
|---|---|---|---|
| Propósito | Controlar acceso de **principales** | Controlar acceso a **recursos** | Fijar la **configuración base** del servicio |
| Mecanismo | Límite de permisos en la API | Límite de permisos en la API | Aplicación en el servicio, **sin acciones de API** |
| Gobierna *service-linked roles* | No | No | **Sí** |
| Ejemplo | Impedir salir de la organización | HTTPS obligatorio | Allowed Images Settings (EC2) |

> **En el examen.** "Garantizar que **ninguna cuenta** pueda hacer pública una AMI / permitir acceso público a un bloque de S3 / usar imágenes no aprobadas, **incluso cuando el servicio añada nuevas APIs**" → **política declarativa**. La línea base persiste aunque cambien funciones, cuentas o principales.

## Cómo funcionan (datos verificados)

- Se adjuntan a la **raíz, OU o cuentas**; las cuentas nuevas la heredan automáticamente.
- **La política efectiva** de una cuenta combina lo heredado y lo adjunto directamente; **se puede consultar** (SCP y RCP no tienen vista efectiva).
- Si desvinculas una declarativa, cada atributo **vuelve a su estado previo** a la política.
- **Afectan a la cuenta de administración** (a diferencia de SCP/RCP).
- Los administradores de las cuentas **no pueden cambiar** a nivel de cuenta los atributos aplicados; las acciones no conformes **fallan**, así que evalúa el impacto antes con el **informe de estado de cuentas** (*account status report*).
- Puedes definir **mensajes de error personalizados** (por ejemplo, un enlace a la wiki interna).
- Los cambios se auditan con CloudTrail.

## Tipos de política de organización relacionados (página de tipos)

Categoría **declarativa/de gestión**, con sus áreas:

| Política | Qué gestiona |
|---|---|
| **EC2** | Configuraciones deseadas de EC2 (p. ej., Allowed Images Settings) |
| **S3** | Configuración de recursos S3 a escala |
| **Backup** | Planes de respaldo en las cuentas |
| **Tag** | Estandarizar etiquetas |
| **AI services opt-out** | Controlar si los servicios de IA de AWS pueden usar tu contenido |
| **Security Hub / GuardDuty / Inspector** | Habilitar y gestionar estos servicios en las cuentas |
| **Bedrock** | Hacer cumplir Guardrails en todas las inferencias |
| **Chat applications** | Control de acceso desde Slack/Teams |
| **Upgrade rollout** | Escalonar actualizaciones automáticas |

Límites de la página: la política de AI opt-out tiene el menor tamaño (**2 500 caracteres**); el resto de declarativas va de 2 500 a 10 000 caracteres y de 5 a 10 adjuntas por destino según el tipo.

## Cuándo usar cada una

| Necesidad | Política |
|---|---|
| "Nadie puede llamar a esta acción" | SCP |
| "Nadie externo accede a este recurso" | RCP |
| "El servicio debe estar configurado así siempre" | Declarativa |
| "Habilitar GuardDuty/Inspector/Security Hub en todas las cuentas" | Política del servicio correspondiente o integración nativa del servicio |
| "No usar mis contenidos para mejorar servicios de IA" | AI services opt-out |

## Patrones de examen

1. **Prohibir AMI no aprobadas en toda la organización** → declarativa de EC2 (Allowed Images Settings).
2. **Línea base que resista nuevas funciones del servicio** → declarativa.
3. **Ver qué cuentas incumplirían antes de aplicarla** → account status report.
4. **Usuarios reciben un error opaco** → mensaje de error personalizado.
5. **Impedir que el contenido se use para entrenar servicios de IA** → AI services opt-out.

## Referencias

- [Políticas declarativas](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_declarative.html)
- [Tipos de políticas de organización](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies.html)
