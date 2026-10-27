## Idea central

La habilidad 2.2.1 pide **capturar y almacenar logs de sistemas y aplicaciones como artefactos forenses**. La evidencia debe ser **completa, íntegra y trazable**, y recolectarse en el **orden correcto** para no perder la más volátil.

## Orden de volatilidad

De la más volátil a la más persistente: **memoria** → conexiones y procesos en ejecución → **disco** → **logs** → copias de seguridad. Por eso la regla clave es: **captura la memoria antes de la respuesta en vivo, el aislamiento o el apagado**.

## Qué artefactos recolectar y de dónde

| Artefacto | Fuente | Cómo se obtiene |
|---|---|---|
| **Logs del plano de control** | CloudTrail (incluidos eventos de datos de S3), VPC Flow Logs | Consulta directa con servicios nativos (Athena, CloudTrail Lake, Logs Insights) o exporta para análisis |
| **Datos y metadatos** | Buckets y objetos de S3 | AWS CLI para metadatos y adquisición de los objetos |
| **Bases de datos** | RDS u autogestionadas | Snapshot del host o de la base, o extracción de datos y logs relevantes |
| **Instancias EC2** | Metadatos, EBS, memoria, logs | Procedimiento ordenado (ver abajo) |
| **Logs de aplicación y sistema** | CloudWatch Logs, S3 | Exportación y copia a almacenamiento de evidencia |

## Procedimiento ordenado para una instancia EC2

La guía de respuesta a incidentes especifica este orden para preservar la mayor cantidad de datos:

1. **Metadatos de la instancia:** ID, tipo, IP, VPC/subred, región, AMI, security groups, hora de lanzamiento.
2. **Activar protecciones y etiquetas:** *termination protection*, comportamiento de apagado en `stop`, desactivar `DeleteOnTermination` en los volúmenes EBS y etiquetas como `Status=Quarantine` que pueden disparar automatizaciones.
3. **Disco:** snapshots de EBS de los volúmenes adjuntos. Los volúmenes de **instance store** requieren respuesta en vivo.
4. **Memoria:** con una herramienta de adquisición de memoria (de código abierto o comercial). Los snapshots de EBS **no contienen** lo que solo está en memoria.
5. **(Opcional) Respuesta en vivo:** solo si no se puede adquirir por otra vía; **modifica** datos del sistema.
6. **Desmantelar:** sacar de Auto Scaling y de los balanceadores de carga, y aplicar un perfil de instancia con permisos mínimos.
7. **Aislar/contener:** bloquear conexiones actuales y futuras.
8. **Decidir:** apagar tras la adquisición (recomendado) o mantener en una cuenta forense aislada e instrumentada.

```bash
aws ec2 modify-instance-attribute --instance-id i-0123456789abcdef0 --disable-api-termination
aws ec2 create-tags --resources i-0123456789abcdef0 --tags Key=Status,Value=Quarantine
aws ec2 create-snapshot --volume-id vol-0123456789abcdef0 \
  --description "IR-CASE-1234 forensic copy" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=CaseId,Value=IR-CASE-1234}]'
```

## Mover y proteger la evidencia

- **Cuenta forense separada:** comparte los snapshots con la cuenta forense (`modify-snapshot-attribute` con `createVolumePermission`) para analizar copias sin tocar el entorno afectado.
- **Snapshots cifrados:** requieren que el rol de análisis tenga permisos sobre la **llave KMS** (y que la llave permita el uso a la cuenta forense).
- **Almacén de evidencia:** bucket de S3 con **Object Lock en modo compliance**, versionado, cifrado por defecto y acceso restringido.
- **Integridad:** calcula **hash (SHA-256)** de imágenes de memoria y logs exportados al crearlos y antes de analizarlos, y registra los resultados.
- **Cadena de custodia:** etiqueta con ID de caso y marca de tiempo, registra cada acceso (CloudTrail y logs de acceso de S3) y documenta quién recolectó qué, cuándo, con qué herramienta y dónde está.
- **Trabaja sobre copias**, nunca sobre el original.
- **Permisos de respondedor:** un rol dedicado con solo lo necesario (`ec2:CreateSnapshot`, `ec2:ModifyInstanceAttribute`, `ec2:CreateTags`, `cloudtrail:LookupEvents`); separa los permisos de solo lectura de los de contención.

## Logs como artefactos forenses

- **CloudTrail:** quién hizo qué (usa un *organization trail* con **validación de integridad** y bucket protegido).
- **VPC Flow Logs y Route 53 Resolver query logs:** comunicación de red y consultas DNS.
- **Logs de aplicación y de sistema operativo** en CloudWatch Logs, con retención adecuada y exportación a S3.
- **Logs de WAF, ELB y CloudFront:** peticiones y orígenes del ataque.
- **Los logs deben existir *antes* del incidente.** Si no se habilitaron, no hay evidencia.

## Patrones de examen

1. **"Capturar evidencia de una instancia comprometida preservando la memoria"** → memoria primero; después snapshot, luego aislamiento.
2. **"Analizar sin alterar la evidencia"** → copiar el snapshot a una cuenta forense y trabajar sobre un volumen creado desde la copia.
3. **"Demostrar que la evidencia no se modificó"** → hash SHA-256, Object Lock, versionado, registro de accesos.
4. **"El snapshot cifrado no se puede abrir en la cuenta forense"** → falta compartir o permitir la llave KMS.
5. **"Evitar perder discos al terminar la instancia"** → desactivar `DeleteOnTermination` y habilitar *termination protection* antes de actuar.

## Referencias

- [Recolectar artefactos relevantes (AWS Security Incident Response User Guide)](https://docs.aws.amazon.com/security-ir/latest/userguide/collect-relevant-artifacts.html)
- [Arquitectura de Automated Forensics Orchestrator](https://docs.aws.amazon.com/solutions/latest/automated-forensics-orchestrator-for-amazon-ec2/architecture-overview.html)
