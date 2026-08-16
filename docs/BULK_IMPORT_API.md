# Importacion masiva de obras

ReadInn permite que un administrador importe obras completas mediante `POST /v1/admin/stories/bulk-import`.
El endpoint esta pensado para herramientas internas y agentes que procesen exclusivamente textos que puedan
redistribuirse legalmente.

## Reglas de seguridad y contenido

- Solo una cuenta con `isAdmin=true` puede usar el endpoint.
- Verifica que la obra sea de dominio publico en la jurisdiccion donde se publicara ReadInn, o que exista una licencia explicita que permita redistribucion.
- Respeta `robots.txt`, limites de frecuencia y terminos del sitio fuente.
- No importes libros comerciales, traducciones sin permiso ni textos cuya licencia sea incierta.
- Conserva la pagina original en `sourceUrl` y el nombre exacto de la licencia en `license`.
- Usa una `importKey` estable por fuente, por ejemplo `gutenberg:1342` o `wikisource:es:don-quijote`.

## Autenticacion

Inicia sesion con la cuenta administradora:

```bash
curl -sS https://api.cypher.cl/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ADMIN_EMAIL","password":"ADMIN_PASSWORD"}'
```

Usa `data.token` como Bearer token. No guardes la contrasena en scripts ni repositorios; entrega el token al agente mediante una variable de entorno.

## Ejemplo

```bash
curl -sS https://api.cypher.cl/v1/admin/stories/bulk-import \
  -H "Authorization: Bearer $READINN_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @readinn-import.json
```

`readinn-import.json`:

```json
{
  "conflictMode": "skip",
  "stories": [
    {
      "importKey": "gutenberg:1342",
      "title": "Pride and Prejudice",
      "authorName": "Jane Austen",
      "synopsis": "A novel of manners centered on Elizabeth Bennet and Fitzwilliam Darcy.",
      "genre": "Clasicos",
      "sourceUrl": "https://www.gutenberg.org/ebooks/1342",
      "license": "Public Domain",
      "languageCode": "en",
      "coverUrl": "https://example.org/covers/1342.jpg",
      "isMature": false,
      "status": "draft",
      "chapters": [
        {
          "title": "Chapter 1",
          "content": [
            "It is a truth universally acknowledged...",
            "However little known the feelings or views..."
          ],
          "status": "published"
        }
      ]
    }
  ]
}
```

Importa primero como `draft`. Revisa portada, capitulos, atribucion y licencia en el estudio antes de publicar la obra.

## Idempotencia y reemplazo

- `conflictMode: "skip"`: una `importKey` existente se omite. Es el modo recomendado para ejecuciones automaticas.
- `conflictMode: "replace"`: elimina la obra importada anteriormente y la vuelve a crear. Esto tambien elimina sus capitulos, comentarios, votos, lecturas y calificaciones vinculadas.

La respuesta indica cuantos elementos fueron creados, reemplazados u omitidos:

```json
{
  "data": {
    "created": 1,
    "replaced": 0,
    "skipped": 0,
    "items": [
      {
        "importKey": "gutenberg:1342",
        "storyId": "UUID",
        "status": "created",
        "chapterCount": 61
      }
    ]
  }
}
```

## Limites

- 20 obras por solicitud.
- 200 capitulos por obra.
- 500 capitulos totales por solicitud.
- 1 MB de texto por capitulo, sujeto tambien al limite de 10 MB configurado en Nginx.
- La solicitud completa es transaccional: si una obra falla, no se importa ninguna del lote.

Para libros extensos, divide el trabajo en lotes de varias obras pequenas. Una obra individual debe enviarse completa en una solicitud.

## Prompt para un agente

```text

Para cada obra:
1. Guarda la URL de la ficha original
2. Extrae titulo, autor original, idioma, sinopsis y capitulos en orden.
3. Limpia menus, pies de pagina, avisos del sitio y encabezados repetidos, sin reescribir el texto literario.
4. Genera una importKey estable con el formato fuente:id.
5. Crea un JSON compatible con docs/openapi-bulk-import.yaml.
6. Importa primero con status=draft y conflictMode=skip.
7. Reporta obras creadas, omitidas y cualquier licencia dudosa. No publiques automaticamente elementos dudosos.

Usa READINN_ADMIN_TOKEN para autenticarte. Nunca solicites ni almacenes la contrasena del administrador.
```

El contrato OpenAPI completo esta en `docs/openapi-bulk-import.yaml`.
