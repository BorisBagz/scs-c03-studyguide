## Idea central

El **borde** es la primera línea de defensa: todo lo que filtres, cachees o absorbas antes de que llegue a tu VPC es carga que tu aplicación no tiene que soportar. La estrategia consiste en **ubicar el control correcto en el punto correcto** y asegurar que el tráfico **no pueda saltarse** ese punto.

> **En el examen.** Las preguntas de borde casi nunca piden "un servicio": piden elegir **dónde** colocar el control (CloudFront, ALB, API Gateway, NLB, Global Accelerator) y **cómo impedir el bypass** (que el atacante llegue directo al origen).

## Servicios de borde y qué aportan

| Servicio | Capa | Aporta en seguridad |
|---|---|---|
| **Amazon CloudFront** | L7 (HTTP/S), CDN global | Termina TLS en el borde, absorbe picos, cachea, soporta WAF, signed URLs/cookies, OAC, geo restriction, field-level encryption. |
| **AWS Global Accelerator** | L3/L4 (TCP/UDP) | IPs anycast estáticas, entrada por la red global de AWS; protegido por Shield. Útil para tráfico no HTTP. |
| **Amazon Route 53** | DNS | Resolución altamente disponible; health checks; alimenta la detección basada en salud de Shield Advanced. |
| **AWS WAF** | L7 | Filtra solicitudes HTTP(S) por reglas (ver tema *AWS WAF*). |
| **AWS Shield** | L3/L4 y L7 | Mitigación de DDoS (Standard y Advanced). |
| **API Gateway / ALB / AppSync** | L7 | Puntos de entrada regionales que también aceptan una web ACL de WAF. |

## AWS Shield: Standard vs Advanced

| | **Shield Standard** | **Shield Advanced** |
|---|---|---|
| Costo | Incluido para todos los clientes de AWS, sin cargo adicional. | Suscripción de pago. |
| Protección | Detección y mitigación automática de ataques comunes de red y transporte (L3/L4). | Protección ampliada para recursos que tú registras, con detección y mitigación L3/L4/L7 más sofisticada. |
| Mitigación automática de capa 7 | No | **Sí**: responde a ataques L7 aplicando reglas de WAF (puede configurarse en *count* o *block*). Añade un grupo de reglas de **150 WCU** a la web ACL. |
| Equipo de respuesta (**SRT**) | No | **Sí**, durante un ataque. Requiere plan de soporte **Business o Enterprise**. |
| *Proactive engagement* | No | El SRT te contacta si un health check de Route 53 asociado se vuelve *unhealthy*; solo en recursos con **detección basada en salud**. |
| **Cost protection** | No | Créditos de servicio por picos de factura causados por un DDoS (incluida transferencia de salida), que se solicitan después del ataque. |
| WAF incluido | No | Cubre tarifas estándar de WAF en recursos protegidos (hasta 1,500 WCU y 50 mil millones de solicitudes por mes). Bot Control, CAPTCHA y cuerpos mayores al tamaño por defecto **no** quedan cubiertos. |
| Grupos de protección | No | Sí (*protection groups*): agrupas recursos para detección y mitigación combinadas. |

> **Detalle útil.** La detección basada en salud usa **health checks de Route 53** y funciona con cualquier tipo de recurso protegido **excepto zonas hospedadas de Route 53**.

> **En el examen.** "Respuesta humana de AWS durante un DDoS" o "protección contra la factura causada por un ataque" → **Shield Advanced**. "Protección DDoS básica sin costo" → **Shield Standard**, que ya está activa.

Shield Advanced se despliega y gobierna a escala con **AWS Firewall Manager** (política de Shield Advanced, sin cargo adicional por la política).

## Dónde colocar la web ACL

- **CloudFront (scope global):** filtra en el borde, antes de llegar a la región. La web ACL de CloudFront se crea en **us-east-1** (N. Virginia) con scope `CLOUDFRONT`.
- **Recursos regionales** (ALB, API Gateway REST, AppSync, Cognito user pool, App Runner, Verified Access...): web ACL **regional**, creada en la misma región que el recurso.
- Una web ACL puede asociarse a varios recursos del mismo scope; un recurso tiene **una sola** web ACL.

Recursos que aceptan una web ACL, según la referencia de la API: distribuciones de CloudFront, REST APIs de API Gateway, Application Load Balancers, APIs GraphQL de AppSync, user pools de Cognito, servicios de App Runner, aplicaciones de Amplify, instancias de Verified Access y gateways de Bedrock AgentCore.

> **Ojo.** Un **Network Load Balancer no admite WAF**. Si necesitas inspección L7 delante de un NLB, la alternativa es poner CloudFront o un ALB delante, o usar AWS Network Firewall en la VPC (L3–L7 con reglas de dominio y firmas).

## Impedir el bypass del origen

Poner CloudFront + WAF no sirve si el atacante puede llamar directamente al ALB o al bucket.

| Origen | Cómo forzar que pase por CloudFront |
|---|---|
| **S3** | **Origin Access Control (OAC)** + bucket policy que solo permite al servicio `cloudfront.amazonaws.com` con condición sobre el ARN de la distribución. Bucket sin acceso público. |
| **ALB / origen personalizado** | CloudFront añade un **encabezado personalizado secreto** y el origen (ALB listener rule o WAF en el ALB) rechaza lo que no lo traiga; y/o permitir en el security group solo la **prefix list administrada de CloudFront** (`com.amazonaws.global.cloudfront.origin-facing`). |
| **Lambda function URL** | OAC para function URLs con firma SigV4 de CloudFront. |
| **API Gateway** | Cuando va detrás de CloudFront, restringir con API key/encabezado secreto o WAF; el endpoint *edge-optimized* ya usa CloudFront gestionado por el servicio. |

## Defensa en capas ante DDoS (arquitectura de referencia)

1. **Reducir la superficie de ataque:** solo exponer lo necesario (CloudFront/ALB), ocultar orígenes, security groups restrictivos.
2. **Escalar:** CloudFront y Route 53 absorben volumen; Auto Scaling para la capa de aplicación.
3. **Filtrar:** WAF (reglas gestionadas, rate-based, geo) y Shield.
4. **Monitorear y responder:** métricas en CloudWatch, alarmas, runbooks; SRT con Shield Advanced.

## Patrones de examen

1. **Proteger una API o sitio contra inyección SQL/XSS** → web ACL de WAF con reglas gestionadas, asociada a CloudFront/ALB/API Gateway.
2. **El origen S3 debe ser accesible solo desde CloudFront** → OAC + bucket policy; nunca bucket público.
3. **El ALB se está atacando directamente, saltando CloudFront** → encabezado secreto + prefix list de CloudFront en el security group.
4. **Tráfico no HTTP (UDP/TCP) con IP fija y protección DDoS** → Global Accelerator (+ Shield).
5. **DDoS L7 con respuesta automática y soporte humano** → Shield Advanced con mitigación automática de capa 7 y SRT.
6. **Gobernar WAF/Shield en toda la organización** → Firewall Manager.

## Referencias

- [Capacidades de Shield Advanced](https://docs.aws.amazon.com/waf/latest/developerguide/ddos-advanced-summary-capabilities.html)
- [Referencia de la API: WebACL (recursos asociables)](https://docs.aws.amazon.com/waf/latest/APIReference/API_WebACL.html)
- [Servir contenido privado con signed URLs y signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html)
