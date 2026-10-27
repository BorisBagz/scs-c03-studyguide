## Idea central

**Amazon Verified Permissions** es un servicio de **autorización de grano fino para tus propias aplicaciones**: centraliza las reglas de "quién puede hacer qué sobre qué" en políticas escritas en **Cedar** y devuelve una decisión de permitir o denegar. Es distinto de IAM: IAM controla el acceso a **recursos de AWS**; Verified Permissions controla el acceso a **recursos de tu aplicación** (documentos, pedidos, pacientes...).

> **En el examen.** "Sacar la lógica de autorización del código de la aplicación, con permisos por usuario/atributo y auditoría" → **Verified Permissions**. "Controlar acceso a un bucket o instancia de AWS" → IAM.

## Conceptos clave

| Concepto | Qué es |
|---|---|
| **Policy store** | Contenedor de políticas y plantillas. Cada store tiene un **schema** que valida las políticas. Por defecto cada aplicación tiene su store; una aplicación multi-tenant puede usar un store por tenant. |
| **Scope** | Principal, acción y recurso a los que aplica una política; sirve para seleccionar solo las políticas relevantes de la solicitud (mejor rendimiento). |
| **Solicitud de autorización** | La aplicación pregunta si un **principal** puede realizar una **acción** sobre un **recurso** en un **contexto**. |
| **Datos de entidades** | Pertenencia a grupos (jerarquía) y atributos del principal y del recurso. |
| **Datos de contexto** | Valores adicionales que se evalúan con la solicitud. |
| **Respuesta** | **Allow o Deny** más los IDs de las políticas determinantes. |
| **Políticas satisfechas, consideradas y determinantes** | Satisfechas = coinciden con la solicitud; consideradas = el conjunto seleccionado; determinantes = las que producen la respuesta. |
| **Enforcement** | Verified Permissions **solo devuelve la decisión**; **tu código debe aplicarla** y bloquear en caso de Deny. |

## Modelo de decisión de Cedar

- **Deny por defecto:** si ninguna política coincide, la respuesta es deny.
- **`forbid` gana sobre `permit`:** si una política `forbid` y una `permit` se satisfacen, la determinante es la `forbid`.

```cedar
// Los miembros del grupo Admins pueden actualizar documentos
permit (
    principal in Group::"Admins",
    action == Action::"UpdateDocument",
    resource
);

// Pero nunca los archivados, ni siquiera los administradores
forbid (
    principal,
    action == Action::"UpdateDocument",
    resource
) when { resource.archived == true };
```

(Ejemplo ilustrativo de la documentación: para un administrador que actualiza un documento archivado, ambas se satisfacen y gana `forbid`.)

## RBAC y ABAC en el mismo modelo

Verified Permissions soporta **RBAC** (permisos a roles o grupos) y **ABAC** (condiciones sobre atributos del principal o del recurso) y Cedar permite **combinar ambos** en una política, por ejemplo: "el grupo X puede acceder solo cuando el atributo `departamento` coincide".

## Lo que conviene verificar en la guía de usuario

La página consultada no detalla: **políticas estáticas vs. basadas en plantillas**, **fuentes de identidad** (típicamente Amazon Cognito u otros proveedores OIDC) ni la sintaxis del schema. En la práctica, la integración habitual es con un user pool de Cognito: el token identifica al principal y sus grupos, y la aplicación (o API Gateway con un authorizer) consulta a Verified Permissions.

## Relación con otros servicios

| Servicio | Diferencia |
|---|---|
| **IAM / SCP** | Autorizan acciones sobre **recursos de AWS** |
| **Cognito** | Autentica usuarios de la app (quién eres); Verified Permissions decide qué pueden hacer |
| **Verified Access** | Acceso de usuarios a **aplicaciones** (red) con identidad y postura del dispositivo; usa políticas Cedar, pero resuelve otro problema |

## Patrones de examen

1. **Autorización centralizada y auditable en una SaaS multi-tenant** → Verified Permissions con policy store por tenant.
2. **Regla "nadie puede borrar datos bajo retención legal"** → política `forbid`.
3. **Permisos que dependen de atributos del recurso (propietario, estado)** → ABAC en Cedar.
4. **Decisión de Deny pero la aplicación igual devuelve datos** → falta aplicar la decisión en el código (enforcement).

## Referencias

- [Conceptos de Amazon Verified Permissions y Cedar](https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/terminology.html)
