## Idea central

En Amazon S3 el cifrado en reposo está **siempre activo**: desde el **5 de enero de 2023** todos los objetos nuevos se cifran con **SSE-S3** como mínimo. La decisión de examen es **qué opción elegir** según quién controla la clave y qué auditoría se necesita.

| Opción | Quién gestiona la clave | Auditoría / control | Notas |
|---|---|---|---|
| **SSE-S3** | S3 (AWS owned) | Ninguno por clave | Línea base, sin costo adicional |
| **SSE-KMS** | KMS (AWS managed o **customer managed**) | **CloudTrail**, política de clave, grants | Aplican cuotas de KMS; hay *Bucket Keys* |
| **DSSE-KMS** | KMS (dos capas) | Igual que SSE-KMS | Doble cifrado para requisitos de cumplimiento |
| **SSE-C** | **Tú**, en cada solicitud | S3 no guarda la clave | Debes enviar la clave en cada request por HTTPS |
| **Cifrado del lado del cliente** | Tú (por ejemplo con AWS Encryption SDK o S3 Encryption Client) | Total, fuera de AWS | S3 solo ve datos cifrados |

> **En el examen.** "Auditar **quién** descifró cada objeto" o "controlar la clave y poder revocarla" → **SSE-KMS con clave customer managed**. "Que AWS **nunca** vea los datos en claro" → **cifrado del lado del cliente**. "Aportar mi propia clave por solicitud" → **SSE-C**. Acceso entre cuentas con SSE-KMS → **clave customer managed** (las AWS managed no se pueden compartir).

> **Nota de verificación.** DSSE-KMS, SSE-C y S3 Bucket Keys se resumen de conocimiento general; el hecho de SSE-S3 como línea base (5-ene-2023) y las reglas de Config sí se confirmaron en documentación de AWS.

## Cómo forzar el cifrado

| Control | Cómo |
|---|---|
| **Cifrado predeterminado del bucket** | Configurar SSE-S3 / SSE-KMS / DSSE-KMS por defecto |
| **Rechazar subidas sin cifrado** | Bucket policy que deniega `s3:PutObject` si falta el encabezado `x-amz-server-side-encryption` (o si no es el esperado) |
| **Solo TLS** | Bucket policy que deniega cuando `aws:SecureTransport` es `false` |
| **Detectar incumplimiento** | Config: `s3-bucket-server-side-encryption-enabled`, `s3-bucket-ssl-requests-only` |
| **Datos sensibles descubiertos** | Macie (ver *Detección*) |

Ejemplo (denegar subidas sin SSE-KMS):

```json
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::example-bucket/*",
  "Condition": {
    "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" }
  }
}
```

## Consideraciones de SSE-KMS

- Cada operación sobre un objeto genera llamadas a KMS: puede haber **cuotas y costo**; los **S3 Bucket Keys** reducen las llamadas.
- Quien lea el objeto necesita permiso en **S3 y en la clave** (`kms:Decrypt`).
- **Acceso entre cuentas:** clave customer managed + key policy que permita a la otra cuenta + IAM en la otra cuenta.
- **Replicación:** si el origen usa SSE-KMS, debes configurar la clave de destino y los permisos en la regla de replicación.
- Si se **elimina o deshabilita la clave**, los objetos no se pueden descifrar.

## Patrones de examen

1. **Todos los objetos deben cifrarse con una clave que la organización controla** → SSE-KMS con CMK + bucket policy que deniega lo demás.
2. **Un partner de otra cuenta lee objetos y recibe AccessDenied** → falta permiso en la clave customer managed (o está usando AWS managed).
3. **Muchas llamadas a KMS generan costos/throttling** → S3 Bucket Keys.
4. **Cumplimiento: nadie en AWS debe poder ver datos en claro** → cifrado del lado del cliente.
5. **Detectar buckets sin TLS** → Config `s3-bucket-ssl-requests-only`.

## Referencias

- [Mejores prácticas de cifrado en S3](https://docs.aws.amazon.com/prescriptive-guidance/latest/encryption-best-practices/s3.html)
