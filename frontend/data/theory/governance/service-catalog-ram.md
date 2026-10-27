## Idea central

Dos servicios habilitan el **uso compartido y controlado** de recursos entre cuentas:

| Servicio | Para qué |
|---|---|
| **AWS Service Catalog** | Ofrecer **productos aprobados** (plantillas de CloudFormation) que los usuarios aprovisionan sin permisos amplios |
| **AWS Resource Access Manager (RAM)** | **Compartir recursos** (subredes de VPC, Transit Gateway, reglas de Resolver, CA privadas...) entre cuentas u OU sin duplicarlos |

> **En el examen.** "Los desarrolladores deben crear solo bases de datos cifradas conformes, sin tener permisos de RDS" → **Service Catalog con launch constraint (rol de lanzamiento)**. "Compartir subredes de una VPC con varias cuentas de la organización" → **RAM**.

## Service Catalog

| Elemento | Qué es |
|---|---|
| **Producto** | Plantilla (y versiones) que define lo que se aprovisiona |
| **Portafolio** | Conjunto de productos con **restricciones** y acceso de usuarios |
| **Launch constraint** | **Rol IAM** con el que se aprovisiona el producto: el usuario final no necesita los permisos de los recursos subyacentes |
| **Template constraint** | Limita parámetros de la plantilla (p. ej. tamaños permitidos) |

Datos verificados sobre compartir portafolios:

- Opciones: **cuenta a cuenta**, **con AWS Organizations**, o **StackSets** (copia).
- Compartir (cuenta a cuenta u Organizations) entrega una **referencia sincronizada**; StackSets crea una **copia** que hay que volver a desplegar para actualizar.
- El portafolio importado **no se puede modificar** (productos y restricciones); el receptor puede conceder acceso IAM a sus usuarios o añadir los productos a un **portafolio local** (hereda las restricciones y puede **añadir**, no quitar).
- Los cambios en el portafolio compartido **se propagan**; si se elimina un producto, lo ya aprovisionado sigue funcionando pero no se puede lanzar de nuevo.
- Rol de lanzamiento: **ARN de rol** (se usa aunque el usuario esté en otra cuenta) o **nombre de rol local**; la cuenta propietaria del rol aprovisiona y paga.
- **No se pueden recompartir** productos de un portafolio importado; la importación debe hacerse en la **misma Región**.

## Seguridad con Service Catalog

- Garantiza **línea base** (cifrado, etiquetado, redes) incrustada en la plantilla.
- Es una de las formas de **impedir** configuraciones no conformes (Config solo detecta).
- Los usuarios finales reciben `servicecatalog:*` limitado y **no** los permisos del servicio subyacente.

## AWS RAM

> **Nota de verificación.** El resumen de RAM es de conocimiento general; no se consultó su documentación en esta sesión (el uso con Private CA y Firewall Manager sí aparece en otras páginas verificadas).

- Comparte recursos sin copiarlos; el propietario conserva el control y los consumidores los usan como propios (p. ej., subredes compartidas).
- Se comparte con **cuentas, OU u organización** (habilitando el uso compartido con Organizations).
- Casos de seguridad: **VPC compartida** (red centralizada), **Transit Gateway**, **reglas de DNS Firewall/Resolver**, **CA privada** (verificado: se puede compartir con RAM), **vaults air-gapped** de Backup (verificado) y conectividad de Network Firewall/Firewall Manager.
- Permisos administrados por recurso; las políticas de RAM pueden acotar el uso.
- Alternativa a **peering** o a duplicar infraestructura.

## Patrones de examen

1. **Autoservicio con límites de seguridad** → Service Catalog con launch constraint.
2. **Un producto actualizado debe llegar a todas las cuentas** → compartir con Organizations (referencia sincronizada), no StackSets.
3. **Varias cuentas emiten certificados desde una CA central** → RAM (Private CA).
4. **Red centralizada con subredes usadas por varias cuentas** → VPC compartida con RAM.
5. **Un desarrollador no puede crear un bucket cifrado directamente, pero sí vía catálogo** → launch role.

## Referencias

- [Compartir portafolios de Service Catalog](https://docs.aws.amazon.com/servicecatalog/latest/adminguide/catalogs_portfolios_sharing.html)
- [Documentación de AWS RAM](https://docs.aws.amazon.com/ram/latest/userguide/what-is.html)
