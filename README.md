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
