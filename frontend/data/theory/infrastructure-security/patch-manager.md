## Qué es

**AWS Systems Manager Patch Manager** automatiza la **evaluación (scan)** y la **instalación** de parches en nodos administrados (EC2 y servidores on-premises registrados en Systems Manager), con reporte de cumplimiento. Es la herramienta para parchear **flotas mutables**; para flotas inmutables se reconstruye la AMI (ver tema *AMIs e imágenes endurecidas*).

Requisito base: el nodo debe ser **administrado por Systems Manager** (SSM Agent instalado y en ejecución, rol/instance profile con permisos de SSM, conectividad a los endpoints de Systems Manager por internet o VPC endpoints).

## Documento de comando: `AWS-RunPatchBaseline`

Es el documento recomendado; reemplaza al antiguo `AWS-ApplyPatchBaseline` (solo Windows). Soporta Linux, macOS y Windows Server (Amazon Linux 2 y 2023, RHEL, Oracle Linux, Debian, Ubuntu; en Windows, aplicaciones publicadas por Microsoft).

| Operación | Efecto |
|---|---|
| **Scan** | Determina el estado de cumplimiento y lo reporta. **No instala ni reinicia.** |
| **Install** | Instala los parches aprobados y aplicables que faltan; **reinicia** salvo que `RebootOption` sea `NoReboot`. |

**`RebootOption`:** por defecto `RebootIfNeeded` (reinicia si se instaló al menos un parche). Con `NoReboot`, los parches quedan como `InstalledPendingReboot` y el nodo se marca **Non-Compliant** hasta reiniciar y volver a escanear.

## Baselines y patch groups

- Un **patch baseline** define qué parches se **aprueban** (reglas por clasificación, severidad, antigüedad con *auto-approval delay*, o listas explícitas de aprobados/rechazados).
- Cada tipo de SO tiene un baseline **por defecto**; puedes crear baselines propios.
- Un **patch group** (etiqueta `Patch Group` en las instancias) asocia nodos a un baseline concreto. Sin patch group se usa el baseline por defecto del SO.
- **Overrides en ejecución:** `InstallOverrideList` (lista YAML de parches a instalar, ignora el baseline; el Scan la ignora) y `BaselineOverride` (preferencias en un objeto JSON en S3).
- El cumplimiento refleja el **baseline**, no las listas de override.

## Cómo se programa

| Mecanismo | Cuándo |
|---|---|
| **Maintenance Windows** | Ventanas con calendario, concurrencia y umbral de errores; el *snapshot ID* lo genera Patch Manager a partir del ID de ejecución. |
| **State Manager association** | Aplicar `Scan` periódicamente para mantener el reporte de cumplimiento actualizado. |
| **Patch policies (Quick Setup)** | Configuración centralizada de patching a nivel de **organización** o varias cuentas/regiones; usa asociaciones de State Manager (`AssociationId`). |
| **Run Command manual** | Una acción puntual. Fuera de una ventana, usa un *snapshot ID* (GUID) único para que todos los nodos reciban el mismo conjunto de parches. |

La concurrencia y el umbral de errores (`MaxConcurrency`, `MaxErrors`) se definen en Run Command / Maintenance Window que invoca el documento, no en el documento.

## Cumplimiento y reporte

- Reporte en Patch Manager y datos de cumplimiento en **Systems Manager Explorer / Fleet Manager** y en **AWS Config** (regla administrada de cumplimiento de parches).
- Los resultados pueden fluir a **Security Hub**.
- Patch Manager **no se recomienda** en instancias de clúster de Amazon EMR.

## Patch Manager vs Inspector

| | **Patch Manager** | **Inspector** |
|---|---|---|
| Función | **Remedia**: instala parches | **Detecta**: encuentra vulnerabilidades |
| Foco | Parches del SO y aplicaciones soportadas | CVEs de paquetes, código, contenedores, exposición de red |

Flujo típico: Inspector detecta un CVE → regla EventBridge → Automation/Run Command ejecuta `AWS-RunPatchBaseline` (Install) sobre las instancias afectadas.

## Patrones de examen

1. **Parchear la flota de forma programada y con reporte** → Patch Manager + Maintenance Window; Scan frecuente con State Manager.
2. **Probar parches primero en desarrollo** → patch groups separados con baselines distintos y *auto-approval delay* mayor en producción.
3. **Instalar un parche urgente concreto ahora** → `InstallOverrideList`.
4. **Parchear todas las cuentas de la organización** → patch policy con Quick Setup.
5. **Nodo "Non-Compliant" tras instalar** → quedó pendiente de reinicio (`NoReboot`) o falló un parche; reiniciar y volver a hacer Scan.
6. **Instancias que no aparecen** → no están administradas por SSM (agente, rol o conectividad).

## Referencias

- [Documento SSM `AWS-RunPatchBaseline`](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-aws-runpatchbaseline.html)
