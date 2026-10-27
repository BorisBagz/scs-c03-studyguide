## Idea central

Hay tres lugares donde puede vivir el material de claves para cifrar tus datos en AWS. La pregunta de examen casi siempre es **¿cuándo vale la pena salir del KMS estándar?**

| | **KMS estándar (almacén predeterminado)** | **Almacén personalizado CloudHSM** | **Almacén de claves externo (XKS)** |
|---|---|---|---|
| Dónde está la clave | HSM gestionados por AWS (multi-tenant) | **Tu clúster de CloudHSM** (HSM de un solo inquilino) | **Tu gestor de claves externo**, fuera de AWS |
| Validación | **FIPS 140-3 nivel 3** | Según HSM del clúster | Depende de tu HSM/sistema |
| Disponibilidad | **SLA del 99.999 %** | **Sin SLA** del almacén | Depende de tu infraestructura |
| Rendimiento | El más alto | Menor | **El menor TPS y mayor latencia** |
| Tipos de clave | Todos | **Solo simétricas** | **Solo simétricas** |
| Multi-Region, importadas, rotación automática | Sí (según tipo) | Multi-Region **no** | **Ninguna** de las tres |
| Recomendación de AWS | **Usar por defecto** | Solo si una regulación lo exige | Solo si una regulación lo exige; **AWS no lo recomienda** salvo necesidad |

> **En el examen.** "Cumplir una regulación que exige que **la clave nunca esté en infraestructura de AWS**" → **XKS**. "Exigir HSM **de un solo inquilino bajo mi control**" → **almacén CloudHSM** (o CloudHSM directo). Si no hay requisito regulatorio, la respuesta es el **KMS estándar**.

## Almacén de claves personalizado de CloudHSM

- KMS usa tu **clúster de CloudHSM** para generar y guardar el material; las llamadas a KMS (`Encrypt`, `Decrypt`) siguen siendo las mismas.
- Eres responsable de la **disponibilidad** del clúster (mínimo recomendado: HSM en varias AZ), de la conectividad y de las copias de seguridad del clúster.
- Límite verificado: **10 almacenes personalizados por cuenta y Región**.
- Si el clúster no está disponible, las claves del almacén no se pueden usar.

## Almacén de claves externo (XKS)

- Arquitectura: **KMS → proxy XKS → gestor de claves externo** (HSM u otro sistema). Tu proxy implementa la API de XKS.
- **Doble cifrado**: el KMS cifra con su propio material y además delega en tu clave externa.
- Latencia: el gestor externo debe responder con un **RTT de hasta ~35 ms** para operar correctamente.
- No soporta claves asimétricas, HMAC, material importado, rotación automática ni multi-Region.
- Si **pierdes o eliminas la clave externa**, los datos cifrados quedan irrecuperables (crypto-shredding): es a la vez el beneficio de control y el riesgo.
- Aumenta el riesgo operativo: si el proxy o el gestor fallan, los servicios AWS que usan esas claves dejan de poder descifrar.

## AWS CloudHSM (uso directo)

HSM dedicados en tu VPC, **un solo inquilino**, con **FIPS 140-2/140-3 nivel 3** (en modo FIPS). Tú controlas la autenticación y los usuarios del HSM; **AWS no puede ver ni extraer tus claves**.

| Aspecto | Detalle |
|---|---|
| **Interfaces** | PKCS#11, JCE (Java), CNG y KSP (Windows) |
| **Responsabilidad** | AWS aprovisiona y mantiene el hardware; tú gestionas usuarios, claves y la aplicación |
| **Cuándo** | Cumplimiento que exija HSM dedicado, firma de código/PKI propia, descarga TLS (SSL offload), cifrado transparente de bases de datos (TDE) |
| **Alta disponibilidad** | Varios HSM en AZ distintas dentro del clúster |

> **Nota de verificación.** Las cifras exactas de validación FIPS por versión de HSM cambian con los modelos; confirma en la página de CloudHSM del momento.

## Cómo elegir

| Requisito | Elección |
|---|---|
| Cifrado general en AWS, mínima gestión | KMS estándar (clave customer managed) |
| Control de política y auditoría de claves | KMS customer managed |
| HSM de un solo inquilino y control de usuarios del HSM | CloudHSM |
| Servicios AWS cifrando con claves en un HSM propio | KMS + almacén CloudHSM |
| Claves **fuera de AWS** obligatoriamente | KMS + XKS |
| Máxima disponibilidad y rendimiento | KMS estándar |

## Patrones de examen

1. **"Los auditores exigen que AWS no tenga acceso técnico al material de claves"** → CloudHSM (o XKS si debe estar fuera de AWS).
2. **Un almacén de claves externo y los servicios dejan de funcionar** → fallo de proxy/gestor externo (latencia o disponibilidad).
3. **Necesito claves asimétricas y almacén personalizado** → no es posible; los almacenes personalizados son solo simétricos.
4. **Menor esfuerzo operativo con cumplimiento FIPS 140-3 L3** → KMS estándar.
5. **Cifrado TDE de Oracle/SQL Server en EC2 con HSM propio** → CloudHSM.

## Referencias

- [Comparar almacenes de claves de KMS](https://docs.aws.amazon.com/kms/latest/developerguide/key-store-overview.html)
- [Almacenes de claves externos (XKS)](https://docs.aws.amazon.com/kms/latest/developerguide/keystore-external.html)
- [Documentación de AWS CloudHSM](https://docs.aws.amazon.com/cloudhsm/latest/userguide/introduction.html)
