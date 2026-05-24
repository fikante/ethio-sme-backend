# Migrations (historical)

Laravel migrations in this folder describe an earlier local schema. **Production uses Supabase** with a different shape for some tables.

See [docs/supabase-schema.md](../docs/supabase-schema.md) for the canonical schema.

Do not run `php artisan migrate` against the live Supabase database unless you are intentionally managing schema there.
