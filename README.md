# Margonem: Duel

Przeglądarkowy RPG-duel inspirowany klasycznym frontendowym prototypem.
Ta wersja jest przepisana na **Next.js (App Router), React i TypeScript**,
ze stanem gry w **Postgresie (Supabase) przez Prismę** — logujesz się nickiem
albo emailem i grasz dalej z dowolnego urządzenia.

<p align="center">
  <img src="docs/screenshots/home.jpg" alt="Ekran rejestracji i logowania" width="820">
</p>

<p align="center">
  <img src="docs/screenshots/game.jpg" alt="Widok gry" width="820">
</p>

## Stack

- Next.js 15 (App Router), React 19, TypeScript
- Postgres (Supabase) + Prisma 7 — zapis stanu gry
- Własne logowanie: nick albo email + hasło, cookie sesji podpisane HMAC
- Zustand jako cache do renderowania
- Deploy na Vercelu

Logika gry wykonuje się **po stronie serwera**: klient wysyła intencję akcji,
nie gotowy stan.

Poprzednia wersja stała na Laravelu, MySQL, Redisie, Horizonie i Reverbie.
Wszystko to zostało zastąpione: patrz [Co się zmieniło](#co-się-zmieniło).

## Uruchomienie

```bash
npm install
cp .env.example .env     # uzupełnij DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm run db:migrate       # tworzy tabele
npm run db:seed          # opcjonalnie: postacie z wersji lokalnej
npm run dev
```

Gra jest pod `http://localhost:3000`.

## Deploy na Vercela

Repo jest standardowym projektem Next.js, więc Vercel wykrywa wszystko sam:

1. Zaimportuj repozytorium na [vercel.com/new](https://vercel.com/new).
2. Framework: **Next.js** (wykrywany automatycznie).
3. Build command i output zostaw domyślne.
4. Deploy.

Wymagane zmienne środowiskowe (Settings → Environment Variables):

| Zmienna | Skąd |
| --- | --- |
| `DATABASE_URL` | Supabase → Connect → Transaction pooler (6543), z `?pgbouncer=true` |
| `DIRECT_URL` | Supabase → Connect → Direct connection (5432) |
| `AUTH_SECRET` | `openssl rand -base64 32` |

Bazę wystarczy raz przygotować: wklej `supabase-setup.sql` do Supabase →
SQL Editor. Szczegóły w [`docs/SUPABASE.md`](docs/SUPABASE.md).

Opcjonalnie możesz przestawić balans gry przez `NEXT_PUBLIC_*` z `.env.example`.

## Skrypty

```bash
npm run dev         # serwer deweloperski
npm run build       # produkcyjny build
npm run start       # serwer produkcyjny
npm run type-check  # tsc --noEmit
npm run lint        # eslint
npm run db:migrate  # prisma migrate deploy
npm run db:seed     # prisma db seed
```

## Struktura

```
src/
├── game/         logika domenowa — czysty TS, bez Reacta i bez storage
│   ├── catalog.ts      mapy, lokacje, przeciwnicy, sklepy, bazy przedmiotów
│   ├── profile.ts      statystyki, poziomy, regeneracja PA
│   ├── battle.ts       auto-walka (expowiska, arena, mocni przeciwnicy)
│   ├── items.ts        losowanie dropów i generowanie przedmiotów
│   ├── bags.ts         pojemność plecaka (baza + założona torba)
│   ├── inventory.ts    ekwipunek, zakładanie, sprzedaż, mikstury
│   ├── rest.ts         odpoczynek w karczmie
│   ├── state.ts        snapshot dla UI, mapa świata, sklep z PA
│   ├── achievements.ts osiągnięcia
│   └── ranking.ts      ranking po poziomie
├── server/       Prisma, sesje, hasła, wykonanie akcji po stronie serwera
├── store/        Zustand: cache profilu i wywołania API
├── components/   komponenty React (te same klasy CSS co w wersji Vue)
├── styles/       `legacy-*.css` — warstwa wizualna starego frontendu
└── app/          trasy: `/`, `/game`, `/rankings`, `/achievements`
```

Podział jest celowy: `src/game/**` nie wie nic o Reakcie ani o tym, gdzie
trzymany jest stan. Dzięki temu dokładnie ten sam kod, który wcześniej liczył
walki w przeglądarce, wykonuje się teraz na serwerze — bez przepisywania.

## Punkty akcji i odpoczynek

W wersji laravelowej PA odnawiały joby kolejki, a zmiany leciały przez Reverb.
Teraz wszystko liczy się z czasu:

- `paRegeneratedAt` to znacznik ostatniego naliczenia,
- `settleProfile()` dolicza punkty na podstawie tego, ile czasu minęło,
- to samo dotyczy odpoczynku w karczmie (`endsAt` w `restTasks`).

Efekt jest ten sam co wcześniej: **PA odnawiają się także wtedy, gdy karta jest
zamknięta**. Nie potrzeba do tego workera ani websocketu — wystarczy jeden
interwał w `useGameClock()` plus przeliczenie przy wejściu i po powrocie
do karty.

## Świat

Dziesięć krain, każda o dziesięć poziomów wyżej niż poprzednia. Wejście
odblokowuje się na ostatnim poziomie krainy wcześniejszej, a każda ma dwa
expowiska po pięć etapów, arenę, mocnych przeciwników, karczmę i sklep.

| # | Kraina | Poziomy | Wymagany poziom | Sklep |
| --- | --- | --- | --- | --- |
| 1 | Ithan | 1-10 | 1 | `blacksmith_1` |
| 2 | Torneg | 11-20 | 9 | `blacksmith_2` |
| 3 | Karka-han | 21-30 | 20 | `blacksmith_2` |
| 4 | Werbin | 31-40 | 30 | `blacksmith_3` |
| 5 | Eaquia | 41-50 | 40 | `blacksmith_4` |
| 6 | Nithal | 51-60 | 50 | `blacksmith_4` |
| 7 | Tuzmer | 61-70 | 60 | `blacksmith_5` |
| 8 | Thuzal | 71-80 | 70 | `blacksmith_5` |
| 9 | Hilaia | 81-90 | 80 | `blacksmith_6` |
| 10 | Elizja | 91-100 | 90 | `blacksmith_6` |

Statystyki przeciwników w krainach 5-10 nie są zgadywane. `scaledEnemy` mnoży
każdą wartość bazową przez `1 + (poziom - 1) * 0,15`, więc kraina dziesięć
poziomów dalej bije mocniej nawet przy tych samych bazach — dlatego rosną one
łagodniej niż podwojenie na krainę z Ithan → Werbin. Cel, mierzony na graczu
w sprzęcie ze sklepu danej krainy i na jej ostatnim poziomie: najsilniejszy
przeciwnik ginie w około sześciu rundach i potrzebuje około sześciu ciosów, by
zabić gracza. To krzywa Karka-hanu, najzdrowsza z pierwszych czterech krain.

## Torby

Obok broni, zbroi i talizmanu jest czwarty slot: **torba**. Założona torba
poszerza plecak — bazowo 15 miejsc, maksymalnie 30. Torby są do kupienia
w każdym sklepie i wypadają z potworów (najrzadszy typ dropu, a większe modele
odblokowuje dopiero poziom przeciwnika).

Zmiana torby na mniejszą albo jej zdjęcie jest **odrzucane**, jeśli w polach
poza nowym rozmiarem leżą jeszcze przedmioty — nic nie ginie po cichu, gra
prosi o zrobienie miejsca.

## Konta i zapis

Logujesz się **nickiem albo emailem** + hasłem. Stan gry siedzi w Postgresie,
więc ta sama postać jest dostępna z każdego urządzenia. Ranking jest globalny.

Hasła są hashowane scryptem (`node:crypto`, bez zależności natywnych). Postacie
przeniesione z wersji lokalnej zachowują swoje stare hasło — ich hash w formacie
`sha256$...` jest nadal akceptowany i po pierwszym logowaniu po cichu
przepisywany na scrypt.

Kto grał wcześniej lokalnie, przy pierwszym wczytaniu gry ma swoją postać
automatycznie przeniesioną z `localStorage` do bazy.

## Baza danych

Schemat, zmienne środowiskowe i szczegóły migracji:
[`docs/SUPABASE.md`](docs/SUPABASE.md).

## Co się zmieniło

| Wcześniej (Laravel) | Teraz (Next.js) |
| --- | --- |
| Kontrolery + Inertia | Trasy App Routera, akcje w storze |
| Eloquent + MySQL | Prisma + Postgres (Supabase) |
| Serwisy w `app/Game/Services` | Moduły w `src/game/**` (port 1:1) |
| Joby kolejki (PA, odpoczynek) | Przeliczanie ze znaczników czasu |
| Reverb + Echo (websocket) | Interwał w `useGameClock()` |
| Sesje Laravela | Własne cookie sesji podpisane HMAC |
| Komponenty Vue 3 | Komponenty React (te same klasy CSS) |
| Docker Compose, Horizon, deploy przez GH Actions | Deploy na Vercelu |

Zasady gry — obrażenia, krytyki, uniki, tabele dropów, ceny, progi poziomów,
osiągnięcia — zostały przeniesione bez zmian.
