## Idea central

**AWS Private Certificate Authority (Private CA)** emite y administra **certificados privados** para tus recursos internos (servicios, dispositivos, usuarios), integrado con **ACM**. Es la pieza de la tarea 5.3 para PKI propia.

> **En el examen.** "Certificados TLS para servicios internos / mTLS entre microservicios sin pagar a una CA pública" → **Private CA**. "Certificado público para un sitio" → **ACM público**.

## Conceptos

| Concepto | Detalle |
|---|---|
| **Jerarquía de CA** | **CA raíz** y **CA subordinadas**; la raíz se mantiene aislada y emite solo a subordinadas |
| **Modos de CA** | **Uso general** (validez de certificados larga) y **de corta duración** (certificados de hasta **7 días**, sin necesidad de revocación) |
| **Revocación** | **CRL** y **OCSP** |
| **Compartir** | Con otras cuentas mediante **AWS RAM** |
| **Claves de la CA** | Protegidas en **HSM validados FIPS** |
| **Renovación en ACM** | ACM renueva certificados **de uso general**; los de corta duración no se renuevan por ACM |
| **Integraciones** | **Connector for Active Directory**, **Connector for SCEP** (dispositivos móviles/red) |
| **Auditoría** | CloudTrail e informes de auditoría de CA |

> **Nota de verificación.** Los puntos de jerarquía, integraciones y modo de corta duración (7 días) se contrastaron con la documentación de Private CA; los precios y límites cambian: consulta la página vigente.

## Diseño recomendado

1. **CA raíz** en una cuenta de seguridad dedicada, con acceso mínimo.
2. **Subordinadas** por entorno o unidad de negocio.
3. **RAM** para que las cuentas de aplicación emitan certificados sin controlar la CA.
4. Política IAM/Control: quién puede emitir (`acm-pca:IssueCertificate`) y con qué plantillas.
5. Revocación (CRL/OCSP) o certificados de **corta duración** para reducir riesgos.
6. Auditar emisión y revocación.

## Patrones de examen

1. **mTLS entre servicios internos con rotación automática** → Private CA + ACM.
2. **Reducir la ventana de exposición de un certificado comprometido sin CRL** → CA de corta duración (≤7 días).
3. **Varias cuentas emiten certificados desde una CA central** → compartir con RAM.
4. **Equipos Windows necesitan certificados del dominio** → Connector for Active Directory.
5. **Dispositivos móviles/red se inscriben automáticamente** → Connector for SCEP.

## Referencias

- [Documentación de AWS Private CA](https://docs.aws.amazon.com/privateca/latest/userguide/PcaWelcome.html)
- [Renovación administrada de certificados en ACM](https://docs.aws.eu/acm/latest/userguide/managed-renewal.html)
