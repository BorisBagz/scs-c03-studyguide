## Idea central

La tarea 5.3 pide saber **cuándo importar material de clave**, cuándo usar **claves multi-Region** y cómo gestionar su ciclo de vida. Son decisiones de **control vs. esfuerzo operativo**.

| | **Generada por KMS** | **Importada (BYOK)** | **Multi-Region** |
|---|---|---|---|
| Material | Lo genera KMS | Lo generas tú fuera de AWS | Mismo material replicado en varias Regiones |
| Rotación automática | Sí (simétricas) | **No** | Se gestiona en la primaria |
| Caducidad | No | Puedes fijarla | Igual que la clave base |
| Copia de durabilidad | AWS | **Tú la conservas** | Réplicas en Regiones |

> **En el examen.** "Regulación exige poder **destruir el material de clave** de forma demostrable y conservar una copia fuera de AWS" → **material importado**. "Cifrar en una Región y descifrar en otra (recuperación ante desastres, tablas globales) con la misma clave" → **claves multi-Region**.

## Material de clave importado

Datos verificados:

- Se soporta para claves KMS salvo los tipos ML-KEM.
- Puedes definir una **fecha de caducidad**; al vencer, la clave no se puede usar hasta reimportar.
- **Reimportar** el mismo material restablece el uso.
- **No hay rotación automática**: se rota **creando una clave nueva** con material nuevo (o reimportando) y actualizando el alias.
- **`DeleteImportedKeyMaterial`** borra solo el material (la clave sigue existiendo y puede reimportarse); **eliminar la clave** tiene un periodo de espera de **7 a 30 días**.
- Los datos cifrados con esa clave **no se pueden descifrar fuera de AWS** con tu copia del material salvo que replique el algoritmo; tú eres responsable de conservar el material original (durabilidad).
- Los almacenes de claves personalizados no admiten material importado ni XKS.

Flujo: crear clave con origen *External* → descargar clave pública de importación y token → cifrar tu material con esa pública → importar.

## Claves multi-Region

> **Nota de verificación.** La página de claves multi-Region no pudo consultarse en esta sesión. Los puntos siguientes provienen de conocimiento general y de lo ya verificado en tipos de clave.

- Un conjunto de claves interoperables con **el mismo ID base (prefijo `mrk-`)** y el mismo material en distintas Regiones: una **primaria** y varias **réplicas**.
- Cada réplica tiene su **propia política de clave** (verificado: no se comparte), alias y permisos.
- Soportadas para **todos los tipos** de clave, pero **no** en almacenes personalizados (verificado).
- Casos de uso: DR, **DynamoDB global tables**, cifrado del lado del cliente con datos que se mueven entre Regiones, **Aurora global**.
- **Se paga por cada réplica** como clave independiente.
- Si la política exige que los datos nunca salgan de una Región por soberanía, **no uses multi-Region**.

## Lo que debes decidir

| Pregunta | Respuesta |
|---|---|
| ¿Hace falta controlar el origen del material? | Importar |
| ¿Necesito rotación automática? | Material de KMS (no importado) |
| ¿Datos entre Regiones con la misma clave? | Multi-Region |
| ¿Debe ser imposible que AWS use la clave? | XKS o CloudHSM |
| ¿Soberanía estricta por Región? | Clave de una sola Región |

## Patrones de examen

1. **Importé material y la clave dejó de funcionar sin que nadie la tocara** → caducó; reimportar.
2. **Necesito rotar una clave importada** → crear nueva clave, actualizar el alias.
3. **Replicar una tabla DynamoDB global cifrada** → claves multi-Region.
4. **Eliminar la clave por seguridad pero con opción de revertir** → programar eliminación (7–30 días) o `DeleteImportedKeyMaterial`.
5. **Mi política de clave en la réplica no tiene los permisos de la primaria** → las políticas no se comparten.

## Referencias

- [Tipos de claves y compatibilidad en KMS](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html)
- [Mejores prácticas de AWS KMS](https://docs.aws.amazon.com/prescriptive-guidance/latest/encryption-best-practices/kms.html)
