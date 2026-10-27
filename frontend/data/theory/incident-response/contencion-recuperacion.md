## Idea central

La habilidad 2.2.4 pide **responder a los recursos afectados: contener y erradicar la amenaza, y recuperar los recursos** (por ejemplo, con controles de contención de red y restauración de copias de seguridad). El orden general es **contener → erradicar → recuperar**, siempre **preservando la evidencia** antes de destruir nada.

## Contención

**Contención de origen (source containment):** bloquear el acceso a tus recursos desde una IP o un rango de red mediante filtrado o enrutamiento.

| Recurso | Técnica |
|---|---|
| **EC2** | Reemplazar los security groups por uno de **aislamiento** (sin `0.0.0.0/0`, solo IP específicas), o quitar las reglas que permiten el tráfico no autorizado. |
| **S3** | Política de bucket que bloquea o permite por IP, rango o **VPC endpoint**. |
| **Aplicaciones web** | **AWS WAF**: añadir la IP a un **IP set** y aplicar una regla de bloqueo. |
| **Identidades IAM** | Desactivar claves de acceso, **revocar sesiones activas** del rol, adjuntar una política de denegación. |

### Aislar una instancia EC2: puntos críticos

1. Crea un security group de **Isolation** sin ninguna regla que permita `0.0.0.0/0`, asócialo a la instancia y **quita los demás**. Los nuevos grupos incluyen por defecto una regla de salida que permite todo: **elimínala**.
2. **Las conexiones ya rastreadas (tracked) no se cortan** al cambiar los security groups; solo se bloquea el tráfico nuevo. Para cortar conexiones existentes, usa **NACL** con reglas de denegación para las IP implicadas.
3. **El DNS de Route 53 no se filtra** con security groups ni NACL; para impedir que una instancia contacte hosts externos, bloquea explícitamente las comunicaciones DNS (por ejemplo, con **Route 53 Resolver DNS Firewall**).
4. Las medidas de red **no resuelven credenciales comprometidas**: hacen falta pasos de IAM aparte.
5. **Antes de terminar** la instancia, captura **memoria y snapshots**.

```bash
aws ec2 create-security-group --group-name Isolation \
  --description "Isolation SG for incident response" --vpc-id vpc-xxxxxxxx

aws ec2 modify-instance-attribute --instance-id i-xxxxxxxxxxxxxxxxx \
  --groups sg-xxxxxxxxxxxxxxxxx

aws ec2 revoke-security-group-egress --group-id sg-xxxxxxxxxxxxxxxxx \
  --ip-permissions IpProtocol=-1,IpRanges='[{CidrIp=0.0.0.0/0}]'
```

### Contener credenciales de IAM

- **Claves de acceso:** desactívalas (`update-access-key --status Inactive`) y luego elimínalas tras la investigación.
- **Sesiones de rol:** la acción *Revoke active sessions* de la consola adjunta una política en línea que **deniega** a las sesiones emitidas **antes** de ese momento mediante `aws:TokenIssueTime`; las sesiones nuevas siguen funcionando.
- **Política de denegación** adjunta al principal afectado (o una **SCP** si afecta a una cuenta).
- **Restablecer** contraseñas y **MFA** de usuarios afectados.

Política de denegación para sesiones anteriores a un momento dado:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": { "DateLessThan": { "aws:TokenIssueTime": "2026-10-26T12:00:00Z" } }
  }]
}
```

## Erradicación

Eliminar la causa y todo rastro del atacante:

- **Escanear malware** en la instancia (por ejemplo, **GuardDuty Malware Protection** a demanda) y eliminarlo.
- **Terminar y reemplazar** una instancia comprometida desde una **AMI conocida y limpia** (idealmente generada con **EC2 Image Builder**) o desde infraestructura como código, en lugar de "limpiar" una máquina de la que no te puedes fiar.
- **Rotar todas las credenciales** que pudieron exponerse (claves, secretos en Secrets Manager, certificados) y revocar sesiones.
- **Eliminar la persistencia** del atacante: usuarios, roles, claves, funciones Lambda y reglas de EventBridge no autorizadas.
- **Cerrar el vector de entrada:** parchear la vulnerabilidad, cerrar puertos innecesarios, corregir políticas, activar MFA.
- **Revisar las demás cuentas y regiones** donde el actor pudo actuar.

## Recuperación

Volver a un estado **conocido y bueno**:

- **Restaurar desde copias de seguridad** con **AWS Backup** (puntos de recuperación de EBS, RDS, EFS, DynamoDB, S3...). Elige un punto **anterior** al compromiso.
- **Protección contra ransomware:** copias en **otra cuenta y región** con **Backup Vault Lock** (inmutable), para que un atacante con credenciales no pueda borrarlas.
- **S3:** recuperar versiones anteriores con **versionado** (y proteger con Object Lock y MFA Delete).
- **Redesplegar** con IaC desde fuentes confiables.
- **Verificar** antes de volver a producción: escaneos con Inspector, comprobación de configuración con Config, monitoreo reforzado durante un tiempo.
- **Recuperar la disponibilidad** con ARC (zonal shift, routing control) cuando la falla afecta zonas o regiones.
- **Lecciones aprendidas:** actualiza playbooks, detección y controles.

## Patrones de examen

1. **"Aislar una instancia comprometida sin perder evidencia"** → snapshot y memoria primero; luego security group de aislamiento sin salida; conservar la instancia apagada o aislada.
2. **"La instancia aislada sigue comunicándose con el atacante"** → las conexiones rastreadas persisten con security groups; usa NACL o detén la instancia.
3. **"Invalidar las credenciales temporales de un rol robado"** → revocar sesiones (deny con `aws:TokenIssueTime`) y corregir el origen.
4. **"Restaurar tras ransomware"** → recuperar desde AWS Backup con Vault Lock en otra cuenta/región, o versiones de S3.
5. **"Bloquear una IP maliciosa que ataca una aplicación web"** → IP set de WAF con regla de bloqueo.
6. **"La instancia sigue resolviendo dominios maliciosos"** → DNS Firewall; los security groups no filtran DNS de Route 53.

## Referencias

- [Contención de origen (AWS Security Incident Response User Guide)](https://docs.aws.amazon.com/security-ir/latest/userguide/source-containment.html)
- [Remediar una instancia EC2 potencialmente comprometida (GuardDuty)](https://docs.aws.amazon.com/guardduty/latest/ug/compromised-ec2)
