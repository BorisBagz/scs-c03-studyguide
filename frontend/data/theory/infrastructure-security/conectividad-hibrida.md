## Idea central

La conectividad entre on-premises, usuarios remotos y AWS se protege con tres decisiones: **cómo se autentica** el extremo, **cómo se cifra** el tráfico y **qué se expone**. La tarea 3.3.2 evalúa **Site-to-Site VPN**, **Direct Connect** (con **MACsec** o IPsec) y **Client VPN**.

## Elegir el enlace

| Necesidad | Opción |
|---|---|
| Red privada cifrada rápida de desplegar, sobre internet | **Site-to-Site VPN** (IPsec) |
| Ancho de banda dedicado y latencia estable | **Direct Connect** |
| Dedicado **y** cifrado de extremo a extremo | Direct Connect **+ VPN IPsec** (private IP VPN) |
| Cifrar el enlace físico entre tu router y AWS | Direct Connect con **MACsec** |
| Empleados remotos que se conectan desde un portátil | **Client VPN** |
| Acceso de usuarios a apps web internas sin VPN | **Verified Access** (ver tema) |

> **En el examen.** **Direct Connect no cifra el tráfico por defecto.** Si la pregunta exige cifrado en tránsito sobre Direct Connect, la respuesta es MACsec (capa 2) o VPN IPsec (capa 3) sobre la conexión.

## AWS Site-to-Site VPN

- Conexión IPsec entre un **customer gateway** (tu dispositivo) y un **virtual private gateway** o un **transit gateway** de AWS.
- **Autenticación del túnel:**
  - **Clave precompartida (PSK):** método por defecto; la generas tú o AWS. Puede guardarse en el servicio o en **AWS Secrets Manager** (opción de seguridad reforzada).
  - **Certificados de AWS Private CA:** sin PSK. Requiere un certificado de una **CA subordinada** de AWS Private CA (firmada por una raíz de ACM o externa) y un rol vinculado al servicio. Se verifica la cadena del certificado del customer gateway. **Rotación:** cualquier certificado de la misma cadena de CA indicada en `CreateCustomerGateway` sirve, sin reconfigurar.
- Si no se especifica la IP del customer gateway, AWS no la comprueba (puedes mover el dispositivo sin reconfigurar).
- Cada conexión tiene **dos túneles** para alta disponibilidad (verifícalo en tu diseño y configura ambos).
- La página consultada no cubre las versiones de IKE ni los algoritmos; revisa "Configure tunnel options" para esos detalles.

## Direct Connect

### Cifrado

| Mecanismo | Alcance | Notas |
|---|---|---|
| **MACsec** (IEEE 802.1AE) | **Capa 2**, punto a punto entre tu router y el dispositivo de Direct Connect | Confidencialidad, integridad y autenticidad de origen. **No** es cifrado de extremo a extremo entre múltiples segmentos. Sin cargo adicional. |
| **VPN IPsec sobre Direct Connect** | Capa 3, extremo a extremo | Combina Direct Connect y Site-to-Site VPN. |
| **Private IP VPN** | Capa 3 sobre una **transit VIF** | IPsec con **IPs privadas** (RFC1918 o RFC6598) sin IPs públicas ni appliances de terceros. Usa **Direct Connect gateway + transit gateway**. |

### MACsec: detalles que se preguntan

- Soportado en **conexiones dedicadas**, **LAG** e interconexiones de partner; **no** en conexiones *hosted*. Velocidades: 10 Gbps (GCM-AES-256 o GCM-AES-XPN-256), 100 y 400 Gbps (solo GCM-AES-XPN-256), en puntos de presencia seleccionados.
- **Claves CKN/CAK:** par precompartido de 256 bits (64 caracteres hexadecimales); solo modo **CAK estático**. La SAK se deriva y **nunca se comparte**. Se asocian con `associate-mac-sec-key` y se guardan en **Secrets Manager** (cifradas con claves administradas por AWS). Si programas el borrado del secreto, el CKN no se puede leer y la conectividad puede verse afectada.
- **Rotación:** manual para CKN/CAK (un *keychain* admite hasta **tres** pares, así que se rota sin interrupción); la **SAK rota automáticamente**.
- **Modos:** **`must_encrypt`** (si no se establece MACsec no se envía tráfico: máxima seguridad, riesgo de disponibilidad) y **`should_encrypt`** (vuelve a texto claro si falla; **por defecto**).
- Requisitos: dispositivo con soporte MACsec, SCI habilitado, XPN en 100/400 Gbps. No soporta *dot1q-in-clear*.

### Private IP VPN: beneficios y requisitos

- Evita el modelo antiguo de **VIF pública** con endpoints VPN públicos (más expuestos a DoS y con acceso a servicios públicos de AWS).
- Soporta más rutas (5,000 salientes y 1,000 entrantes frente a 200 y 100 de Direct Connect solo).
- Requisitos: transit gateway (con un CIDR privado para la VPN que **no se solape** con otros attachments), Direct Connect gateway y asociación entre ambos con el CIDR en la lista de prefijos permitidos.
- Útil para cumplimiento (financiero, salud, gobierno).

## AWS Client VPN

VPN gestionada basada en TLS (OpenVPN) para usuarios remotos.

| Aspecto | Detalle |
|---|---|
| **Autenticación** | **Active Directory** (usuario), **certificados mutuos** y **SAML SSO** (usuario). Tras autenticar, el cliente recibe una IP del *Client IPv4 CIDR*. |
| **Autorización** | **Authorization rules** por red destino, para todos o por **grupo de acceso** (AD/IdP). Se evalúan antes de enrutar. |
| **Security groups** | El SG del endpoint se asocia a la ENI de la subred objetivo; sus reglas de salida deben permitir el destino. |
| **NAT** | El origen se traduce a la IP privada de la ENI: los destinos deben permitir esa IP. |
| **Split tunnel** | Habilitado: solo las rutas del endpoint viajan por la VPN. Deshabilitado: se empuja 0.0.0.0/0 y **todo** el tráfico del cliente pasa por la VPN. |
| **Flujo** | Autenticar → reglas de autorización → tabla de rutas de Client VPN → SG → NAT → tabla de rutas de la subred → NACL. |

> **En el examen.** "Empleados remotos con SSO corporativo y acceso por grupo a redes distintas" → Client VPN con **SAML** + authorization rules por grupo. "Solo ciertos usuarios llegan a la subred de finanzas" → regla de autorización con grupo de acceso.

## Patrones de examen

1. **Sitio remoto cifrado en horas** → Site-to-Site VPN al transit gateway.
2. **Sin claves precompartidas** → autenticación de túnel con certificados de Private CA.
3. **Cumplimiento exige cifrado sobre Direct Connect sin IPs públicas** → private IP VPN sobre transit VIF.
4. **Cifrar el enlace de 10/100 Gbps entre tu DC y AWS** → MACsec con `must_encrypt` si no se tolera tráfico sin cifrar.
5. **Rotar claves MACsec sin cortar servicio** → agregar un segundo par CKN/CAK al keychain.
6. **Acceso remoto de usuarios con MFA/SSO** → Client VPN con SAML o AD.

## Referencias

- [Cifrado en AWS Direct Connect](https://docs.aws.amazon.com/directconnect/latest/UserGuide/encryption-in-transit.html)
- [MAC Security en Direct Connect](https://docs.aws.amazon.com/directconnect/latest/UserGuide/MACsec.html)
- [VPN Site-to-Site con IP privada sobre Direct Connect](https://docs.aws.amazon.com/vpn/latest/s2svpn/private-ip-dx)
- [Opciones de autenticación de túneles de Site-to-Site VPN](https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-tunnel-authentication-options.html)
- [Flujo de conexión y tráfico de AWS Client VPN (re:Post)](https://www.repost.aws/articles/ARYB4LBePgRO6vf7XMRfzWFQ/aws-client-vpn-connection-and-traffic-flow-handling-simplified)
