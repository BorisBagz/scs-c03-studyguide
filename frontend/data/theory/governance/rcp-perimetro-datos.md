## Idea central

Las **políticas de control de recursos (RCP)** fijan el **máximo de permisos sobre los recursos** de las cuentas de la organización, **sin importar quién** haga la solicitud. Son la herramienta para construir un **perímetro de datos** y limitar el acceso externo a escala.

| | **SCP** | **RCP** |
|---|---|---|
| Limita | Lo que pueden hacer los **principales** de la organización | Lo que se puede hacer **sobre los recursos**, incluso por principales externos |
| Se evalúa | Cuando el principal de tu organización llama | **Cuando se accede al recurso**, quien sea el solicitante |
| Concede permisos | No | No |

> **En el examen.** "Garantizar que **ningún principal externo** pueda acceder a los buckets de la organización aunque alguien edite una bucket policy" → **RCP** (las SCP no afectan a principales fuera de la organización).

## Datos verificados

- Servicios soportados **en el lanzamiento**: **Amazon S3, AWS STS, AWS KMS, Amazon SQS y AWS Secrets Manager**. Pueden haberse añadido más desde entonces; la RCP solo cubre un subconjunto de servicios, así que para el resto usa reglas de **Config** y Lambda para monitorear/corregir.
- Sin costo adicional; disponible en las Regiones comerciales.
- Requiere **all features**; lo habilita la cuenta de administración o un administrador delegado.
- Al habilitar RCP se adjunta la política administrada **`RCPFullAWSAccess`** a todas las entidades (permite todo, para no cambiar el comportamiento hasta que adjuntes las tuyas).
- Cuotas independientes de las SCP: hasta **5 RCP** por raíz/OU/cuenta, **5 120 caracteres** por RCP, **1 000 RCP** por organización.
- **No afectan a recursos de la cuenta de administración**, pero sí a cuentas miembro que son administradores delegados.
- Las RCP **no impiden guardar** una política de recursos más permisiva: simplemente la RCP se evalúa igual y puede denegar.
- Prueba primero en cuentas/OU de test; gestiónalas como código en CI/CD; **Control Tower** puede desplegar controles basados en RCP y detectar deriva.

## Ejemplo de perímetro: identidades de la organización

Deniega las acciones de S3 cuando la solicitud viene de fuera de la organización y no la hace un servicio de AWS:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "EnforceOrgIdentities",
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": "*",
    "Condition": {
      "StringNotEqualsIfExists": { "aws:PrincipalOrgID": "o-xxxxxxxxxx" },
      "BoolIfExists": { "aws:PrincipalIsAWSService": "false" }
    }
  }]
}
```

(Basado en el ejemplo del blog de lanzamiento; el patrón es "denegar si NO es de mi organización Y NO es un servicio AWS". Ajusta excepciones para integraciones de terceros legítimas.)

## Perímetro de datos (visión de conjunto)

> **Nota de verificación.** El modelo de perímetro de datos (tres objetivos × tres controles) es el marco de AWS que se enseña habitualmente; se resume aquí de conocimiento general.

| Objetivo | Quién | Mecanismo típico |
|---|---|---|
| Solo **identidades de confianza** acceden a mis recursos | RCP / políticas de recursos con `aws:PrincipalOrgID` | RCP |
| Mis identidades solo acceden a **recursos de confianza** | SCP con `aws:ResourceOrgID` | SCP |
| Acceso solo desde **redes esperadas** | Políticas de endpoint de VPC, `aws:SourceVpc`/`aws:SourceVpce`, `aws:SourceIp` | Política de endpoint, SCP, RCP |

## Patrones de examen

1. **Evitar que un equipo comparta un bucket con cuentas ajenas aunque cambie la bucket policy** → RCP con `aws:PrincipalOrgID`.
2. **Forzar HTTPS en todas las cuentas para S3/otros** → RCP que deniega si `aws:SecureTransport` es false.
3. **Mis desarrolladores no deben copiar datos a buckets fuera de la organización** → SCP con `aws:ResourceOrgID` (control sobre principales).
4. **Un servicio de AWS accede a mi recurso y la RCP lo bloquea** → faltó la excepción `aws:PrincipalIsAWSService`.
5. **La RCP no está bloqueando recursos de la cuenta de administración** → correcto, no los afecta.

## Referencias

- [Introducción a las RCP (blog de AWS)](https://aws.amazon.com/blogs/aws/introducing-resource-control-policies-rcps-a-new-authorization-policy)
- [Tipos de políticas de organización](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies.html)
