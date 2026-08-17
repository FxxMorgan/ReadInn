# Busqueda y taxonomia de obras

ReadInn separa los generos de las etiquetas narrativas. Una obra puede tener
hasta 5 generos y 20 etiquetas.

- `genres`: clasificacion editorial principal, por ejemplo Fantasia, Romance o Accion.
- `type`: estructura o formato narrativo, por ejemplo Isekai, LitRPG o Regresion.
- `setting`: ambientacion, por ejemplo Academia, Reino o Cyberpunk.
- `tone`: tono y desenlace, por ejemplo Oscuro, Feel Good o Final abierto.
- `content`: advertencias, por ejemplo Gore, +18 o Contenido sensible.
- `theme`: temas, tropos, protagonistas y recursos narrativos.

## Obtener opciones

```http
GET /v1/stories/filters
```

La respuesta contiene `genres`, `tagGroups` y `sortOptions`. Los clientes deben
consumir este endpoint en lugar de mantener listas independientes.

## Buscar obras

```http
GET /v1/stories?query=dragon&genres=Fantasia,Aventura&tags=Magia,Academia&genreMode=any&tagMode=all&mature=exclude&minChapters=5&minRating=4&sort=rating&page=1&limit=20
```

Parametros disponibles:

| Parametro | Valores | Descripcion |
| --- | --- | --- |
| `query` | texto | Busca en titulo, autor, sinopsis, generos y etiquetas. |
| `genres` | CSV | Uno o varios generos. |
| `tags` | CSV | Una o varias etiquetas. |
| `genreMode` | `any`, `all` | Exige cualquier genero o todos los seleccionados. |
| `tagMode` | `any`, `all` | Exige cualquier etiqueta o todas las seleccionadas. |
| `mature` | `exclude`, `include`, `only` | Controla obras para adultos. |
| `language` | codigo | Filtra por codigo de idioma. |
| `minChapters` | entero | Cantidad minima de capitulos publicados. |
| `minRating` | 0-5 | Valoracion promedio minima. |
| `sort` | `recent`, `popular`, `rating`, `chapters`, `title` | Orden de resultados. |

`genre` sigue aceptado para conservar compatibilidad con APK anteriores.

## Obra destacada

```http
GET /v1/stories/featured
```

La seleccion se conserva durante 24 horas y usa actividad real de lectura. Si
no existe actividad suficiente, utiliza la mejor obra publicada disponible. No
se deben mostrar fixtures como tendencias cuando el dispositivo esta offline.

## Crear o actualizar una obra

```json
{
  "title": "El reino de ceniza",
  "synopsis": "Una exploradora despierta en un reino que olvido su propia magia.",
  "genres": ["Fantasia", "Aventura", "Romance"],
  "tags": ["Isekai", "Magia", "Reino", "Oscuro"],
  "isMature": false,
  "status": "draft"
}
```

Para actualizar clasificacion o portada:

```http
PATCH /v1/me/stories/{storyId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "genres": ["Fantasia", "Aventura"],
  "tags": ["Magia", "Academia"],
  "coverColor": "https://cdn.example.com/cover.jpg"
}
```

Enviar `coverColor: null` elimina la portada actual.
