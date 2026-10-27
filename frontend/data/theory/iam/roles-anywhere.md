## Idea central

**IAM Roles Anywhere** permite que **cargas de trabajo fuera de AWS** (servidores on-premises, contenedores, aplicaciones en otra nube) obtengan **credenciales temporales de IAM** sin usar claves de acceso de larga duración. Se autentican con **certificados X.509** emitidos por tu propia autoridad certificadora (PKI) y usan los mismos roles y políticas IAM que las cargas dentro de AWS.

> **En el examen.** "Servidor on-premises necesita llamar a S3 de forma segura sin claves de acceso permanentes, y ya existe una PKI" → **IAM Roles Anywhere**. Si la carga corre en EC2/ECS/Lambda, se usa el rol del servicio, no Roles Anywhere.

## Conceptos

| Concepto | Qué es |
|---|---|
| **Trust anchor** | Referencia a una CA que establece la confianza entre tu PKI e IAM Roles Anywhere. Apunta a **AWS Private CA** o a un certificado de CA **externa**. Una cuenta puede tener varios. |
| **Rol** | Rol IAM estándar cuya *trust policy* permite al principal de servicio de Roles Anywhere y se vincula al trust anchor con la condición `aws:SourceArn` (ARN del trust anchor). |
| **Profile** | Define qué roles puede asumir Roles Anywhere y qué pueden hacer las credenciales. Puede incluir **muchos roles** pero **una sola política de sesión** (administrada o en línea) que limita los permisos de la sesión. |

Todos los recursos de Roles Anywhere son **regionales**, y deben estar en la misma cuenta y región para usarse juntos.

## Flujo

1. La carga presenta un **certificado X.509 válido** (y firma la solicitud con su clave privada).
2. Roles Anywhere valida el certificado contra el trust anchor.
3. Devuelve **credenciales temporales** para un rol del perfil, limitadas por la política de sesión del perfil.
4. La carga llama a los servicios de AWS con esas credenciales.

AWS ofrece un *signing helper* (`aws_signing_helper`) para obtener las credenciales a partir del certificado; la página consultada no lo documenta, confirma su uso en la guía de usuario.

## Límite de confianza

El límite de confianza es la **cuenta**: cualquier trust anchor de la cuenta puede usarse para asumir cualquier rol de esa cuenta salvo que la *trust policy* del rol añada condiciones. Por eso conviene acotar con condiciones (por ejemplo, el ARN del trust anchor concreto o atributos del certificado). Tampoco hay integración automática con los controles de AWS Organizations.

Ejemplo (ilustrativo; verifica acciones y principal en la documentación del modelo de confianza):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "rolesanywhere.amazonaws.com" },
    "Action": ["sts:AssumeRole", "sts:TagSession", "sts:SetSourceIdentity"],
    "Condition": {
      "ArnEquals": {
        "aws:SourceArn": "arn:aws:rolesanywhere:us-east-1:111122223333:trust-anchor/EXAMPLE-ID"
      }
    }
  }]
}
```

## Lo que conviene verificar en la guía oficial

La página consultada no cubre: revocación mediante CRL, duración de sesión (por lo general se configura en el perfil; el valor típico es 1 hora y el máximo 12 horas, a confirmar) ni la lista de CA externas soportadas. Revísalos antes de afirmarlo como regla.

## Patrones de examen

1. **Eliminar claves de acceso de servidores on-premises** → Roles Anywhere con certificados de la PKI corporativa.
2. **Usar AWS Private CA como emisor** → trust anchor apuntando a Private CA.
3. **Limitar lo que puede hacer cualquier carga que use el perfil** → política de sesión en el profile.
4. **Impedir que otro trust anchor de la cuenta asuma un rol sensible** → condición `aws:SourceArn` con el trust anchor correcto.

## Referencias

- [¿Qué es IAM Roles Anywhere?](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/introduction.html)
