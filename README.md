# Mapa del Camino · Santiago Ways

Página web única y **responsive** (escritorio + móvil) del mapa interactivo de las
rutas del Camino de Santiago.

## Cómo publicarlo en GitHub Pages

1. Crea un repositorio nuevo en GitHub y **sube todo el contenido de esta carpeta**
   (que `index.html` quede en la raíz del repo).
2. En el repo: **Settings → Pages**.
3. En *Build and deployment* elige **Deploy from a branch**, rama `main` (o `master`)
   y carpeta `/ (root)`. Guarda.
4. Espera ~1 minuto. Tu URL será `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

> **Importante:** el archivo `.nojekyll` (vacío) debe subirse tal cual. Sin él,
> GitHub ignora la carpeta `_ds/` (empieza por guion bajo) y la página no carga
> bien.

## Qué incluye

```
index.html                     ← página de inicio
app-responsive.js              ← lógica (mapa + estado, escritorio y móvil)
styles-responsive.css          ← estilos
data/caminos.js                ← datos de las rutas y etapas
assets/                        ← logo e isotipo
_ds/…/colors_and_type.css      ← tokens de color y tipografía (Santiago Ways)
_ds/…/_ds_bundle.js            ← sistema de diseño
.nojekyll                      ← evita que GitHub Pages oculte _ds/
```

## Notas

- El **trazado real de las rutas** (siguiendo caminos/sendas) se calcula al cargar
  vía un servicio de routing y se cachea en el navegador. Necesita conexión la
  primera vez; si el servicio no responde, dibuja la línea recta entre paradas.
- React y Leaflet se cargan desde CDN, así que hace falta conexión a internet.

🐚 Buen Camino.
