## Idea central

Una **imagen endurecida (golden image)** es una AMI o imagen de contenedor construida con configuración de seguridad ya aplicada, probada y versionada. En lugar de corregir cada instancia después de lanzarla, **corriges la imagen y reemplazas las instancias** (infraestructura inmutable). La tarea 3.2.1 del examen evalúa cómo **automatizar** esa construcción con **EC2 Image Builder** y **Systems Manager**.

> **En el examen.** "Garantizar que toda instancia nueva nace con la línea base de seguridad" → pipeline de imágenes + control de qué AMIs se pueden lanzar. "Parchear" una flota inmutable → construir una AMI nueva y reemplazar, no parchear en caliente.

## EC2 Image Builder

Servicio **gratuito**: pagas solo los recursos que usa para crear, almacenar y compartir las imágenes.

| Concepto | Qué es |
|---|---|
| **Image recipe** | Imagen base (tuya, de Amazon o compartida) + componentes de construcción + componentes de prueba. |
| **Componentes** | Scripts que modifican el SO o el software. Los hay administrados por AWS y propios. Existen componentes **STIG** (para Windows, y para otros SO) que escanean errores de configuración, ejecutan remediaciones y aplican políticas locales; se etiquetan low/medium/high, que se asimilan a las categorías CAT de DISA. |
| **Tests** | Pruebas propias (PowerShell en Windows, scripts en Linux) o administradas por AWS. |
| **Pipeline** | Ejecuta la receta bajo demanda o por **calendario** (por ejemplo, mensual para incorporar parches). Usa un **rol IAM** (idealmente de mínimo privilegio). |
| **Infrastructure configuration** | Tipo de instancia de construcción, subred y security group. La instancia debe alcanzar Systems Manager (por internet o por **VPC endpoint**). Se puede notificar por **SNS**. |
| **Distribution settings** | Copia la AMI a otras regiones y la comparte con cuentas concretas (permisos de lanzamiento); también aplica nombre, etiquetas y configuración de licencias. |

Amazon Inspector aparece como componente administrado para escanear la imagen durante la construcción; consulta la guía de Image Builder para la lista vigente de componentes (por ejemplo, benchmarks CIS) antes de asumir que uno concreto existe.

### Qué endurecer en una imagen

- Eliminar paquetes y servicios innecesarios; deshabilitar puertos y protocolos inseguros.
- Aplicar benchmarks (**CIS**, **STIG**), parches de SO y configuración de logging/agentes (SSM Agent, CloudWatch Agent).
- No incluir **secretos ni claves** en la imagen: se obtienen en ejecución desde Secrets Manager o Parameter Store.
- Exigir **IMDSv2** (la AMI puede registrarse con `imds-support=v2.0`, que fija `HttpTokens` en *required* y el hop limit en 2).
- Cifrar los snapshots/volúmenes de la AMI con KMS cuando corresponda.

## Gobernar qué imágenes se usan

- **Compartir** solo con cuentas de la organización (permisos de lanzamiento o compartir vía Organizations/RAM).
- **Allowed AMIs** (control a nivel de cuenta/organización que limita las AMIs lanzables a las aprobadas por criterios como cuenta propietaria): verifícalo en la documentación de EC2 antes de citarlo en una respuesta, porque no pude confirmar su alcance exacto en las fuentes consultadas.
- Etiquetas y **políticas SCP/IAM** con condiciones sobre la AMI para impedir lanzamientos desde imágenes no aprobadas.
- Automatizar el parámetro "última AMI aprobada" en **Systems Manager Parameter Store** para que las plantillas de lanzamiento la resuelvan al desplegar.

## Imágenes de contenedor

- Usa imágenes base mínimas y oficiales; construye con multi-stage para no incluir herramientas de compilación.
- Escanea en **Amazon ECR** (Inspector, ver tema *Amazon Inspector*) al subir y de forma continua.
- Ejecuta contenedores como usuario no root, con sistema de archivos de solo lectura cuando sea posible.
- **ECR**: etiquetas inmutables (*tag immutability*), políticas de ciclo de vida, cifrado con KMS y replicación entre cuentas/regiones.
- Image Builder también construye **imágenes de contenedor** con recetas y pipelines análogos.

## Systems Manager en el ciclo de vida

- **Automation** (runbooks) para orquestar acciones como crear AMIs, parchear y relanzar.
- **Parameter Store** para publicar la AMI vigente.
- **Patch Manager** y **State Manager** para mantener el estado deseado de las instancias en ejecución (ver tema *Patch Manager*).

## Patrones de examen

1. **Imagen con línea base CIS/STIG, repetible y programada** → Image Builder: receta con componentes de endurecimiento + pipeline con calendario.
2. **Distribuir la imagen aprobada a otras regiones/cuentas** → distribution settings de Image Builder.
3. **Parchear sin tocar instancias en producción** → nueva AMI con pipeline y reemplazo (Auto Scaling instance refresh).
4. **Evitar secretos en la AMI** → Secrets Manager/Parameter Store en tiempo de ejecución.
5. **Impedir lanzar instancias desde imágenes no aprobadas** → controles de gobernanza de AMIs (políticas/SCP, allowed AMIs).

## Referencias

- [Cómo crear AMIs conformes con STIG con EC2 Image Builder (AWS Security Blog)](https://aws.amazon.com/blogs/security/quickly-build-stig-compliant-amazon-machine-images-using-amazon-ec2-image-builder)
- [Opciones de IMDS en EC2 (`imds-support` en la AMI)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html)
