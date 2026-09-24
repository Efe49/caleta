# ALBA

Taller de velas para calcular stock, recetas, coste y precio de venta. No es un CRM de clientes: sirve para saber qué hay en el almacén, cuántas velas puedes hacer y a qué precio conviene venderlas. Los importes están en euros y la interfaz en español.

Los datos viven en un archivo SQLite dentro de la aplicación. No hay usuarios ni base de datos aparte. La primera vez aparecen productos y una vela de ejemplo; se pueden editar o borrar.

## Desarrollo

Hace falta Node.js 22.

```bash
npm install
npm run dev -- --port 4721
```

Abre [http://localhost:4721](http://localhost:4721).

La base de datos se crea en `data/alba.db`.

```bash
npm test
npm run lint
```

## Docker

La imagen de producción guarda SQLite en un volumen, así que los datos siguen ahí al reiniciar el contenedor.

```bash
docker compose up --build
```

La aplicación queda en [http://localhost:4730](http://localhost:4730).

Para pararla:

```bash
docker compose down
```

`docker compose down` no borra el volumen. Para eliminar también los datos: `docker compose down -v`.

## Actualizar

En la cabecera de cada página está el botón **Actualizar**. El navegador solo llama a `POST /api/actualizar`. No envía dirección del repositorio, rama ni comando.

Esa ruta habla con el servicio `updater` de Compose, en la red interna (`http://updater:8091/update`). El servicio `alba` no monta el socket de Docker. `updater` es el que tiene el checkout del servidor y el socket.

La actualización es fija:

1. `git pull --ff-only` de la rama actual, contra el remoto que ya tenga ese checkout.
2. Respuesta al navegador.
3. Después, `docker compose up -d --build alba`.

Si el pull sale bien, el botón muestra exactamente «Actualización en marcha» antes de que `alba` se reinicie. Si falla, muestra el error real: no hay repositorio, no se ha podido autenticar, o el pull no es un avance rápido.

Las credenciales de un repositorio privado se quedan en el checkout del servidor. No se copian a la imagen. El volumen `alba-data` no se borra.

```bash
docker compose up --build
```

En `npm run dev`, si `updater` no está en marcha, el botón dice que el servicio de actualización no responde y que la aplicación no se ha actualizado. No finge que el taller ya está al día.
