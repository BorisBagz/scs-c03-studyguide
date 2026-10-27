// Copiar a config.js y llenar después de desplegar el backend (sam deploy).
// Nota: al ser un frontend estático público, esta API key es visible para
// cualquiera que inspeccione el código fuente. No protege datos sensibles;
// solo evita que el endpoint reciba tráfico anónimo trivial.
const CONFIG = {
  API_BASE_URL: "https://REPLACE.execute-api.REGION.amazonaws.com/prod",
  API_KEY: "REPLACE_WITH_API_GATEWAY_KEY",
};
