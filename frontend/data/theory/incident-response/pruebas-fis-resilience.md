## Idea central

La habilidad 2.1.3 pide **recomendar procedimientos para probar y validar la eficacia de un plan de respuesta**. Los servicios de ejemplo son **AWS Fault Injection Service (FIS)** y **AWS Resilience Hub**. Un plan que nunca se probó es una hipótesis: estas herramientas lo convierten en evidencia.

## AWS Fault Injection Service (FIS)

**FIS** ejecuta **experimentos de ingeniería del caos** inyectando fallas controladas en tus recursos de AWS para comprobar si tus alarmas, runbooks y arquitectura reaccionan como esperas.

### Plantilla de experimento (experiment template)

| Componente | Qué define |
|---|---|
| **Actions** | Las fallas a inyectar; pueden ejecutarse en orden o en simultáneo y cada una referencia uno o más targets. |
| **Targets** | Los recursos afectados: por `resourceArns` **o** `resourceTags` (no ambos), con `filters` opcionales (por ejemplo, `State.Name = running`) y un `selectionMode` (`ALL`, `COUNT(n)`, `PERCENT(n)`). |
| **Stop conditions** | **Alarmas de CloudWatch** que definen un rendimiento inaceptable. Si alguna entra en `ALARM`, FIS **detiene el experimento**. Se pueden omitir, pero no se recomienda. Deben monitorear la salud visible por el usuario, no solo el recurso afectado. |
| **Experiment role** | Rol de IAM que FIS asume para actuar en tu nombre; su trust policy debe permitir `fis.amazonaws.com` y sus permisos cubrir las acciones y los tipos de recurso. Sin él no corre el experimento. |
| **Report configuration** | Informes del experimento en S3 con instantáneas de dashboards de CloudWatch y ventanas previa y posterior. |
| **Logging** | Registro del experimento en CloudWatch Logs o S3. |

```json
{
  "description": "Detener una instancia del tier web",
  "targets": {
    "webInstances": {
      "resourceType": "aws:ec2:instance",
      "resourceTags": { "app": "web" },
      "filters": [{ "path": "State.Name", "values": ["running"] }],
      "selectionMode": "COUNT(1)"
    }
  },
  "actions": {
    "stopInstance": {
      "actionId": "aws:ec2:stop-instances",
      "targets": { "Instances": "webInstances" }
    }
  },
  "stopConditions": [
    { "source": "aws:cloudwatch:alarm", "value": "arn:aws:cloudwatch:us-east-1:123456789012:alarm:web-5xx-high" }
  ],
  "roleArn": "arn:aws:iam::123456789012:role/AllowFISActions"
}
```

> **En el examen.** Las **stop conditions** son la salvaguarda clave: sin ellas un experimento podría causar un incidente real. Y el **rol del experimento** limita lo que FIS puede tocar (mínimo privilegio).

### Qué se valida con FIS

- Que las **alarmas realmente se disparan** ante la falla.
- Que los **runbooks y la remediación automática** recuperan el servicio.
- Que la arquitectura **tolera** la pérdida de instancias, de una AZ o de dependencias.
- Que los equipos saben responder (ejercicios tipo *game day*).

## AWS Resilience Hub

**Resilience Hub** evalúa y mejora la **resiliencia** de una aplicación frente a objetivos de recuperación.

| Concepto | Descripción |
|---|---|
| **Application / AppComponent** | Conjunto de recursos supervisados; un AppComponent agrupa los que funcionan y fallan como una unidad (por ejemplo, una base de datos primaria y su réplica). |
| **Resilience policy** | Objetivos de **RTO** (tiempo máximo aceptable de restauración) y **RPO** (pérdida máxima aceptable de datos) por tipo de interrupción. |
| **Tipos de interrupción** | **Aplicación** (por ejemplo, un mal despliegue o corrupción de datos), **infraestructura en la nube** (fallo de componente), **zona de disponibilidad** y **región**. |
| **Assessment** | Evalúa cada AppComponent frente a la política y estima RTO y RPO. Estados: *policy met*, *policy breached*, *not assessed*, *changes detected*. Detecta **drift** de política y de recursos. |
| **Resilience score** | Qué tanto sigue la aplicación las recomendaciones: alarmas, **SOP** (procedimientos operativos estándar) y pruebas. |
| **Recomendaciones** | Mejoras de arquitectura, costo y operación. |
| **Tests** | Experimentos de **FIS** recomendados para inyectar fallas, comprobar que las alarmas detectan la interrupción y que los SOP recuperan la aplicación, y medir el RTO y RPO reales. |

> **Relación entre ambos.** **Resilience Hub recomienda** qué probar (y los SOP y alarmas), y **FIS ejecuta** las pruebas.

## Cómo probar un plan de respuesta de seguridad

1. **Tabletop exercise:** simulación en mesa de un escenario (por ejemplo, credenciales expuestas), sin tocar recursos.
2. **Simulaciones técnicas** en un entorno de prueba: generar hallazgos de ejemplo de GuardDuty o simular acciones maliciosas controladas.
3. **Experimentos de FIS** con stop conditions para validar alarmas y recuperación.
4. **Game days** periódicos y revisión posterior con lecciones aprendidas.
5. **Validar métricas:** tiempo de detección, de contención y de recuperación frente a RTO/RPO.

## Patrones de examen

1. **"Comprobar que la arquitectura tolera la caída de una AZ"** → experimento de FIS dirigido a recursos de una AZ, con stop condition.
2. **"Verificar que las alarmas detectan el fallo y que el runbook recupera el servicio"** → experimentos de FIS recomendados por Resilience Hub.
3. **"Definir y evaluar los objetivos de recuperación (RTO/RPO) de una aplicación"** → resilience policy y assessment de Resilience Hub.
4. **"Evitar que el experimento cause una interrupción real"** → stop conditions con alarmas y selección acotada de targets.
5. **"Detectar cambios que rompen la política de resiliencia"** → drift detection de Resilience Hub.

## Referencias

- [Componentes de una plantilla de experimento de FIS](https://docs.aws.amazon.com/en_us/fis/latest/userguide/experiment-templates.html)
- [Conceptos de AWS Resilience Hub](https://docs.aws.amazon.com/resilience-hub/latest/userguide/concepts-terms.html)
