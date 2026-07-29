# Supabase + Prisma

Gra trzyma stan w Postgresie hostowanym przez Supabase. Prisma jest źródłem
prawdy dla schematu i warstwą dostępu po stronie serwera. Supabase Auth **nie
jest używane** — logowanie jest własne (nick albo email + hasło).

## Co gdzie żyje

| Warstwa | Gdzie |
| --- | --- |
| Logika gry (czysty TS) | `src/game/**` |
| Akcje gracza po stronie serwera | `src/server/profileService.ts` |
| Logowanie, hasła, cookie sesji | `src/server/auth.ts`, `src/server/session.ts` |
| Schemat bazy | `prisma/schema.prisma` |
| API | `src/app/api/**` |
| Klient (cache do renderowania) | `src/store/gameStore.ts` |

Klient wysyła **intencję** (`{ type: 'fightStage', ... }`), nigdy gotowego
stanu. Serwer wczytuje profil, uruchamia tę samą funkcję z `src/game/**`,
zapisuje wynik i odsyła nowy profil. Dzięki temu podmiana `localStorage` nie
daje już nikomu 10 000 złota.

## Zmienne środowiskowe

Ustaw je w Vercelu (Settings → Environment Variables) dla **Production**,
**Preview** i **Development**.

| Zmienna | Skąd wziąć | Do czego |
| --- | --- | --- |
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** (port 6543) | połączenia w runtime |
| `DIRECT_URL` | Supabase → Connect → **Direct connection** (port 5432) | migracje |
| `AUTH_SECRET` | wygeneruj: `openssl rand -base64 32` | podpisywanie cookie sesji |

Do `DATABASE_URL` dopisz `?pgbouncer=true`, np.:

```
postgresql://postgres.<ref>:<hasło>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Hasło do bazy musi być zakodowane URL-em, jeśli zawiera znaki specjalne
(`!` → `%21`, `@` → `%40`).

Klucze `anon` i `service_role` **nie są potrzebne** — nie używamy Supabase
Auth ani PostgREST. Przeglądarka nigdy nie łączy się z bazą bezpośrednio.

## Pierwsze uruchomienie bazy

Najprościej — wklej `supabase-setup.sql` do Supabase → SQL Editor i uruchom.
Plik tworzy schemat i wgrywa postacie przeniesione z wersji lokalnej. Można go
puścić kilka razy, nic się nie zdublikuje.

Alternatywnie, z lokalnej maszyny z ustawionym `DIRECT_URL`:

```bash
npm run db:migrate   # prisma migrate deploy
npm run db:seed      # prisma db seed
```

## Hasła

Hashe są tagowane schematem, więc dwa formaty żyją obok siebie:

- `scrypt$<sól>$<klucz>` — konta zakładane tutaj (`node:crypto`, bez zależności natywnych)
- `sha256$<sól>$<klucz>` — przeniesione z wersji lokalnej, gdzie przeglądarka liczyła `SHA-256(sól + ":" + hasło)`

Dzięki temu przeniesiona postać loguje się **tym samym hasłem co wcześniej** —
nie trzeba go nigdzie znać ani resetować. Przy pierwszym udanym logowaniu wpis
jest po cichu przepisywany na scrypt.

## Migracja postaci z `localStorage`

Kto grał przed podłączeniem bazy, ma postać w `localStorage` przeglądarki. Przy
pierwszym wczytaniu gry klient wysyła ją na `POST /api/game/import`. Serwer
przyjmuje ją **tylko wtedy, gdy konto nie ma jeszcze profilu**, więc nie da się
tym nadpisać istniejącego postępu. Po udanym imporcie klucz jest kasowany.

## Czego jeszcze nie ma

- **Rate limiting** na `/api/auth/login`. Przy publicznym deployu warto dołożyć.
- **RLS** nie jest włączone, bo nic poza serwerem nie łączy się z bazą — rolą
  `postgres` z connection stringa. Gdyby kiedyś przeglądarka miała czytać
  tabele bezpośrednio, RLS trzeba włączyć **zanim** to nastąpi.
- Reset hasła — świadomie pominięty.
