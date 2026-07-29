# Przejście na Supabase

Gra działa dziś w całości w przeglądarce: stan siedzi w Zustandzie i jest
zapisywany do `localStorage`. Ten dokument opisuje, co trzeba zrobić, żeby
przełączyć się na Supabase — i dlaczego kod jest już pod to przygotowany.

## Dlaczego to będzie proste

Logika gry w `src/game/**` jest czystym TypeScriptem. Nie importuje Reacta, nie
zna Zustanda, nie dotyka `window`. Każda funkcja przyjmuje `GameProfile`,
mutuje go i ewentualnie rzuca `GameError`. Dokładnie ten sam kod może się
wykonać w Server Action albo w Edge Function.

Jedyne miejsce, które wie o storage, to `src/store/`:

- `persistence.ts` — typy `Account` / `GameBackend` i lokalne hashowanie hasła
- `gameStore.ts` — akcje gracza (`mutate()` klonuje profil, uruchamia logikę, zapisuje)
- `hooks.ts` — selektory i zegar gry

## Schemat bazy

`GameProfile` jest płaskim obiektem JSON, więc mapuje się 1:1 na wiersz.
Pola JSON (`inventory`, `equipped`, `stage_progress`, `rest_tasks`) zostają
jako `jsonb`.

```sql
create table public.game_profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    nick text not null unique,

    level smallint not null default 1,
    exp integer not null default 0,
    exp_max integer not null default 20,
    gold integer not null default 100,

    pa smallint not null default 20,
    pa_max smallint not null default 20,
    pa_regenerated_at timestamptz not null default now(),

    played_seconds integer not null default 0,
    last_seen_at timestamptz not null default now(),

    vitality smallint not null default 5,
    strength smallint not null default 5,
    luck smallint not null default 5,
    vitality_points_assigned smallint not null default 0,
    strength_points_assigned smallint not null default 0,
    luck_points_assigned smallint not null default 0,
    attribute_points smallint not null default 0,

    hp integer not null default 50,
    dmg_min smallint not null default 1,
    dmg_max smallint not null default 2,
    armor smallint not null default 0,
    crit_chance numeric(5, 2) not null default 5,
    crit_power numeric(6, 2) not null default 150,
    dodge numeric(5, 2) not null default 3,
    stun numeric(5, 2) not null default 0,

    monsters_killed integer not null default 0,
    unique_items_found integer not null default 0,
    heroic_items_found integer not null default 0,
    legendary_items_found integer not null default 0,

    current_map_id smallint not null default 1,
    rest_tasks jsonb not null default '{}'::jsonb,
    stage_progress jsonb not null default '{}'::jsonb,
    inventory jsonb not null default '[]'::jsonb,
    equipped jsonb not null default '{"weapon":null,"armor":null,"accessory":null}'::jsonb,

    updated_at timestamptz not null default now()
);

alter table public.game_profiles enable row level security;

-- Gracz czyta i zapisuje wyłącznie własny profil.
create policy "own profile read" on public.game_profiles
    for select using (auth.uid() = id);

create policy "own profile write" on public.game_profiles
    for update using (auth.uid() = id) with check (auth.uid() = id);

-- Ranking musi widzieć cudze nicki i poziomy — osobny, wąski widok.
create view public.player_rankings as
    select id, nick, level, exp from public.game_profiles;

grant select on public.player_rankings to authenticated;
```

Kolumny są `snake_case`, a typ TS jest `camelCase`. Potrzebny jest więc mapper
(`toRow` / `fromRow`) — najlepiej obok `persistence.ts`.

## Kroki migracji

1. **Auth.** Podmień `register` / `login` w `gameStore.ts` na
   `supabase.auth.signUp` i `signInWithPassword`. Wtedy `accounts`, `createSalt`
   i `hashPassword` z `persistence.ts` znikają — hasłami zarządza Supabase.
2. **Ładowanie profilu.** Zaimplementuj `GameBackend` na `supabase-js` i wołaj
   `loadProfile` po zalogowaniu zamiast czytać z `persist`.
3. **Zapis.** W `mutate()` po `set(...)` dorzuć `void backend.saveProfile(draft)`.
   Warto to zdebouncować (~500 ms), bo bitwy potrafią lecieć seriami.
4. **Ranking.** `useRanking()` zamiast `Object.values(profiles)` czyta
   `player_rankings` (z limitem i sortowaniem po stronie bazy).
5. **`persist` zostaje jako cache offline** albo znika — obie opcje działają.

## Uwaga o zaufaniu do klienta

Dziś cała logika (walki, dropy, ceny) liczy się w przeglądarce, więc gracz może
sobie nadpisać `localStorage` i dać sobie 10 000 złota. Przy jednoosobowej grze
lokalnej to nie problem, ale **globalny ranking bez serwera nie ma sensu**.

Docelowo, przy Supabase, akcje zmieniające stan powinny trafić na serwer:

- Next.js Server Actions albo Route Handlers z `SUPABASE_SERVICE_ROLE_KEY`, albo
- Supabase Edge Functions

W obu wypadkach importujesz te same funkcje z `src/game/**` — nie trzeba
przepisywać logiki, wystarczy przenieść miejsce jej wykonania. Klient zostaje
wtedy tylko warstwą prezentacji, tak jak było w wersji laravelowej.
