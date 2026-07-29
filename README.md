# Margonem: Duel

Przeglądarkowy RPG-duel inspirowany klasycznym frontendowym prototypem.
Ta wersja jest przepisana na **Next.js (App Router), React i TypeScript**,
ze stanem gry w **Zustandzie** — bez backendu, gotowa do wrzucenia na Vercela.

<p align="center">
  <img src="docs/screenshots/home.jpg" alt="Ekran rejestracji i logowania" width="820">
</p>

<p align="center">
  <img src="docs/screenshots/game.jpg" alt="Widok gry" width="820">
</p>

## Stack

- Next.js 15 (App Router), React 19, TypeScript
- Zustand + `persist` (localStorage) jako warstwa zapisu
- Cała logika gry po stronie klienta, w czystym TypeScripcie
- Deploy na Vercelu, bez bazy danych i bez kolejek

Poprzednia wersja stała na Laravelu, MySQL, Redisie, Horizonie i Reverbie.
Wszystko to zostało zastąpione: patrz [Co się zmieniło](#co-się-zmieniło).

## Uruchomienie

```bash
npm install
npm run dev
```

Gra jest pod `http://localhost:3000`. Nie trzeba nic konfigurować — plik
`.env` jest opcjonalny (zobacz `.env.example`, jeśli chcesz zmienić tempo
regeneracji PA albo ceny odpoczynku).

## Deploy na Vercela

Repo jest standardowym projektem Next.js, więc Vercel wykrywa wszystko sam:

1. Zaimportuj repozytorium na [vercel.com/new](https://vercel.com/new).
2. Framework: **Next.js** (wykrywany automatycznie).
3. Build command i output zostaw domyślne.
4. Deploy.

Zmienne środowiskowe nie są wymagane. Jeśli chcesz przestawić balans gry,
dodaj wybrane `NEXT_PUBLIC_*` z `.env.example` w ustawieniach projektu.

## Skrypty

```bash
npm run dev         # serwer deweloperski
npm run build       # produkcyjny build
npm run start       # serwer produkcyjny
npm run type-check  # tsc --noEmit
npm run lint        # eslint
```

## Struktura

```
src/
├── game/         logika domenowa — czysty TS, bez Reacta i bez storage
│   ├── catalog.ts      mapy, lokacje, przeciwnicy, sklepy, bazy przedmiotów
│   ├── profile.ts      statystyki, poziomy, regeneracja PA
│   ├── battle.ts       auto-walka (expowiska, arena, mocni przeciwnicy)
│   ├── items.ts        losowanie dropów i generowanie przedmiotów
│   ├── inventory.ts    ekwipunek, zakładanie, sprzedaż, mikstury
│   ├── rest.ts         odpoczynek w karczmie
│   ├── state.ts        snapshot dla UI, mapa świata, sklep z PA
│   ├── achievements.ts osiągnięcia
│   └── ranking.ts      ranking po poziomie
├── store/        Zustand: akcje gracza, zapis, selektory, zegar gry
├── components/   komponenty React (te same klasy CSS co w wersji Vue)
├── styles/       `legacy-*.css` — warstwa wizualna starego frontendu
└── app/          trasy: `/`, `/game`, `/rankings`, `/achievements`
```

Podział jest celowy: `src/game/**` nie wie nic o Reakcie ani o tym, gdzie
trzymany jest stan. Dzięki temu ta sama logika może później pojechać na serwer
(Server Actions albo Supabase Edge Functions) bez przepisywania.

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

## Konta i zapis

Konta są **lokalne**. Rejestracja tworzy postać w `localStorage` tej
przeglądarki (hasło jest solone i hashowane SHA-256, ale to tylko prosta
bramka — bez serwera nie ma czego uwierzytelniać). W jednej przeglądarce może
istnieć wiele postaci.

Z tego wynika też ranking: obejmuje postacie z tej przeglądarki, nie graczy z
całego świata. Globalna tabela przyjdzie razem z Supabase.

## Supabase

Plan przejścia na Supabase — wraz z gotowym schematem SQL, politykami RLS i
listą kroków — jest w [`docs/SUPABASE.md`](docs/SUPABASE.md).

## Co się zmieniło

| Wcześniej (Laravel) | Teraz (Next.js) |
| --- | --- |
| Kontrolery + Inertia | Trasy App Routera, akcje w storze |
| Eloquent + MySQL | `GameProfile` w Zustandzie (localStorage) |
| Serwisy w `app/Game/Services` | Moduły w `src/game/**` (port 1:1) |
| Joby kolejki (PA, odpoczynek) | Przeliczanie ze znaczników czasu |
| Reverb + Echo (websocket) | Interwał w `useGameClock()` |
| Sesje Laravela | Lokalne konta w `localStorage` |
| Komponenty Vue 3 | Komponenty React (te same klasy CSS) |
| Docker Compose, Horizon, deploy przez GH Actions | Deploy na Vercelu |

Zasady gry — obrażenia, krytyki, uniki, tabele dropów, ceny, progi poziomów,
osiągnięcia — zostały przeniesione bez zmian.
