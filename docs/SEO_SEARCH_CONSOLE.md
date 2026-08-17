# SEO y Google Search Console

ReadInn publica automáticamente:

- `https://readinn.cypher.cl/robots.txt`
- `https://readinn.cypher.cl/sitemap.xml`
- `https://readinn.cypher.cl/manifest.webmanifest`

El sitemap se regenera dinámicamente y contiene la portada, obras publicadas y perfiles de autores. Las páginas privadas y las obras `+18` no se indexan.

## Configuración opcional

Para verificar el dominio mediante una meta etiqueta de Google, agrega en el entorno de producción de la web:

```env
NEXT_PUBLIC_SITE_URL=https://readinn.cypher.cl
GOOGLE_SITE_VERIFICATION=valor_entregado_por_google
```

Después recompila la web. No subas ese valor a documentos públicos si la propiedad usa otro método de verificación.

## Alta en Search Console

1. Añade `https://readinn.cypher.cl` como propiedad de dominio o prefijo de URL.
2. Completa la verificación DNS o mediante la variable anterior.
3. En **Sitemaps**, registra `sitemap.xml`.
4. Usa la inspección de URL para validar la portada y una obra pública.

Los capítulos se descubren desde sus páginas de obra. Las páginas `+18` requieren autenticación y confirmación de edad, por lo que no se envían al índice.
