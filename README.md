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
│   ├── catalog.ts      mapy, lokacje, przeciwnicy
│   ├── shops.ts        sklep każdego miasta, zatowarowany na jego poziomy
│   ├── profile.ts      statystyki, poziomy, regeneracja PA
│   ├── battle.ts       auto-walka (expowiska, arena, mocni przeciwnicy)
│   ├── gearCurve.ts    krzywa mocy sprzętu na poziom (obrażenia, pancerz, HP, cena)
│   ├── gear.ts         dziesięć tierów przedmiotów i budowanie pojedynczej sztuki
│   ├── items.ts        losowanie dropów: typ, jakość i rzadkość
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

| # | Kraina | Poziomy | Wymagany poziom | Sklep (towar na poziomy) |
| --- | --- | --- | --- | --- |
| 1 | Olszawa | 1-10 | 1 | Kuźnia (1-10) |
| 2 | Rudzin | 11-20 | 9 | Kuźnia (11-20) |
| 3 | Wielgrad | 21-30 | 20 | Zbrojownia (21-30) |
| 4 | Czarnobór | 31-40 | 30 | Skład Traperski (31-40) |
| 5 | Sołwar | 41-50 | 40 | Skład Portowy (41-50) |
| 6 | Nihrast | 51-60 | 50 | Kuźnia Żarowa (51-60) |
| 7 | Zhurmat | 61-70 | 60 | Bazar Zhurmatu (61-70) |
| 8 | Grzmiel | 71-80 | 70 | Płatnerz (71-80) |
| 9 | Ismeria | 81-90 | 80 | Zbrojownia Wygnańców (81-90) |
| 10 | Zoryan | 91-100 | 90 | Skarbiec Zoryanu (91-100) |

Statystyki przeciwników w krainach 5-10 nie są zgadywane. `scaledEnemy` mnoży
każdą wartość bazową przez `1 + (poziom - 1) * 0,15`, więc kraina dziesięć
poziomów dalej bije mocniej nawet przy tych samych bazach — dlatego rosną one
łagodniej niż podwojenie na krainę z Olszawy → Czarnoboru. Cel, mierzony na
graczu w sprzęcie ze sklepu danej krainy i na jej ostatnim poziomie:
najsilniejszy przeciwnik ginie w około sześciu rundach i potrzebuje około
sześciu ciosów, by zabić gracza. To krzywa Wielgradu, najzdrowsza z pierwszych
czterech krain.

### Mapy miast

Wszystkie dziesięć map (`public/game-assets/maps`) i wszystkie sylwetki NPC
(`public/game-assets/npcs`) są generowane z jednego opisu w
[`tools/town-art`](tools/town-art) — nie ma tam żadnej cudzej grafiki:

```bash
python3 tools/town-art/build.py          # rysuje mapy i NPC-ów, zapisuje layout.json
python3 tools/town-art/build.py --check   # sama walidacja układu
python3 tools/town-art/emit_catalog.py    # przepisuje współrzędne do catalog.ts
```

Miasto jest opisane w kafelkach w `towns.py`. Z tego samego opisu powstaje
obrazek **i** prostokąty klikalne w [`catalog.ts`](src/game/catalog.ts), więc
kuźnia nie może się rozjechać z ramką, w którą się klika. Plansza ma 25 × 16
kafelków po 32 px — dokładnie tyle, ile mierzy `#map-area`. Po zmianie układu
uruchom `build.py`, potem `emit_catalog.py`.

Zmiana nazw krain zmieniła też identyfikatory lokacji, a `stageProgress` jest
po nich kluczowane. `RENAMED_EXPEDITIONS` w [`state.ts`](src/game/state.ts)
tłumaczy stary klucz na nowy przy odczycie, więc postacie zachowują odblokowane
etapy expowisk.

### Ikony przedmiotów

Wszystkie 120 ikon sprzętu (`public/game-assets/items/gear`) też jest rysowanych
z kodu — po jednej na każdy kształt każdego tieru:

```bash
python3 tools/gear-art/build.py            # rysuje wszystkie ikony
python3 tools/gear-art/build.py --check    # sprawdza tabelę, nic nie rysuje
python3 tools/gear-art/build.py --tier 3 --sheet arkusz.png   # jeden tier + podgląd
```

`TIER_SHAPES` w [`build.py`](tools/gear-art/build.py) to ta sama tabela co
`GEAR_TIERS` w [`gear.ts`](src/game/gear.ts), a `--check` przerywa build, jeśli
tier prosi o kształt, którego nikt nie umie narysować — dodanie broni do gry mówi
więc od razu, jakiej grafiki brakuje, zamiast wypuścić martwy link do obrazka.
Paleta każdego tieru jest odczytana z ikon, które gra miała wcześniej, więc stal
Wielgradu została tą samą stalą.

## Sklepy

Każde miasto ma **własny sklep, zatowarowany na własne dziesięć poziomów** —
Olszawa sprzedaje sprzęt na 1-10 i już zawsze tylko taki, Rudzin na 11-20, a
Skarbiec Zoryanu na 91-100. To te same przedziały co w tabeli wyżej, a przy tym
dokładnie granice tierów sprzętu, więc półka miasta jest zawsze wycięta z tieru
tego miasta.

Wcześniej sklepów było sześć na dziesięć krain, a do stałej listy dochodziła
rotacja licząca się **z poziomu gracza** — czyli w każdym mieście świata stało to
samo, a postać na sześćdziesiątym poziomie znajdowała u kowala w Olszawie sprzęt
na sześćdziesiąty poziom. Nie miało znaczenia, gdzie się jest. Do tego połowa
stałych wpisów była nieosiągalna: `blacksmith_3` stał w Czarnoborze za bramą na
poziom 30, a `blacksmith_2` musiał obsłużyć przedział od 9 do 30.

Teraz sklep należy do krainy. W obrębie przedziału półka rośnie w **czterech
progach co trzy poziomy**: od zwykłego sprzętu na pierwszym poziomie krainy do
jednej sztuki legendarnej na jej ostatnim. Na każdy próg idą dwie rzadkości i
wszystkie trzy sloty, a bazy rotują wraz z progiem, więc sklep pokazuje niemal
wszystkie kształty swojego tieru, a nie ten sam miecz cztery razy.

Sklep pokazuje cały przedział, także to, na co jeszcze nie masz poziomu — widać,
do czego warto dorosnąć — ale **kupić można wyłącznie przedmiot na swój poziom**.
Reguła siedzi w `buyItem`, nie w widoku sklepu, więc obowiązuje niezależnie od
tego, skąd przyszło kliknięcie.

Poza sprzętem każdy sklep ma dwie najświeższe torby swojego przedziału (najnowszą
też w rzadkości, która rośnie z krainą — od unikalnej po legendarną) i dwa
flakony PA, wycenione tak jak PA w karczmie.

Ceny liczą się z tej samej krzywej co łup (`itemValueBudget`), z narzutem ×3 —
kupno to około sześciu sprzedanych dropów, więc sklep jest podłogą sprzętu, a nie
sufitem. Torby mają narzut ×2, bo `createBagItem` i tak wycenia je na czterokrotność
przedmiotu ze swojego poziomu.

Stan sklepów powstaje **raz przy wczytaniu modułu**, a losowe bonusy w nim są
zaziarnione identyfikatorem przedmiotu (`seededRandom`). Wcześniej rotacja
przeliczała się przy każdym tyknięciu zegara i przy każdym zakupie, więc bonusy
przedmiotu zmieniały się pod kursorem, a kupiona sztuka nie była tą, którą
pokazywał tooltip.

## Łup

Drop jest główną ścieżką rozwoju — sklep jest podłogą, a nie sufitem. Wszystko,
co skalowane poziomem (i drop, i towar w sklepach), liczy się z jednej
krzywej w [`gearCurve.ts`](src/game/gearCurve.ts), odczytanej z przeciwników,
których gracz na danym poziomie faktycznie bije:

| Krzywa | Cel |
| --- | --- |
| Obrażenia broni | HP przeciwnika / 11,5 — około sześciu rund na zabicie |
| Pancerz | 0,30 × obrażeń przeciwnika — noszony zjada niecałą połowę ciosu |
| Punkty życia | 3,2 × obrażeń przeciwnika — około dziewięciu ciosów do przeżycia |
| Wartość | 4 × złota przeciwnika — sprzedany łup to mniej więcej dwa zabicia |

Liczby opisują **zwykły** przedmiot o średniej jakości; noszony sprzęt to
najlepszy z wielu dropów, więc rzadkość, jakość i baza windują go do ~1,5×.

Sprzęt dzieli się na **dziesięć tierów, po jednym na krainę**. Tier zmienia
wygląd i nazwę (`Stalowy Topór` → `Smoczy Topór`), nigdy matematykę — a że
kształty rotują, plecak na setnym poziomie wygląda inaczej niż na dziesiątym.
Każdy tier ma **pięć broni, cztery zbroje i trzy talizmany** (wcześniej trzy,
dwie i dwa — kraina wypadała przez dziesięć poziomów tymi samymi trzema
mieczami). Kształtów jest w sumie szesnaście broni, dwanaście zbroi i dwanaście
talizmanów: obok miecza, topora i młota są też szabla, berdysz, kiścień, nadziak,
trójząb i kostur, obok kolczugi karacena, brygantyna i bechter, a obok amuletu
pieczęć, kieł, wisior i sfera.

Każda baza ma swój charakter: młot bije mocniej w wąskim zakresie, sztylet
najsłabiej, ale ciągnie w krytyki, karacena kryje więcej niż brygantyna, lecz
mniej w niej życia. Do tego każdy przedmiot losuje jakość ±15%, więc dwa te same
miecze z tego samego poziomu nie mają identycznych statystyk.

Procenty — krytyk, unik, ogłuszenie — **nie** rosną z poziomem, tylko z tierem
i rzadkością. Wcześniej mnożył je `1 + poziom * 0,1`, przez co jeden drop z
pięćdziesiątego poziomu parkował gracza na limitach 50% krytyka i 40% uniku,
a wszystko znalezione później było już bez znaczenia.

## Torby

Obok broni, zbroi i talizmanu jest czwarty slot: **torba**. Założona torba
poszerza plecak — bazowo 15 miejsc, maksymalnie 30. Torby są do kupienia
w każdym sklepie (dwa najświeższe modele przedziału danej krainy) i wypadają
z potworów (najrzadszy typ dropu, a większe modele
odblokowuje dopiero poziom przeciwnika). Modeli jest sześć — od `Mieszka` po
`Kufer` z sześćdziesiątego piątego poziomu — a rzadkość dokłada od zera do
trzech miejsc. Wypadają tylko trzy najświeższe modele: na dziewięćdziesiątym
poziomie `Mieszek` byłby już tylko śmieciem.

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

Zasady gry — obrażenia, krytyki, uniki, ceny, progi poziomów, osiągnięcia —
zostały przeniesione bez zmian. Wyjątkiem jest łup: skalowanie dropu było
liniowe, a przeciwników wykładnicze, więc obie krzywe się rozjeżdżały i po
mniej więcej dwudziestym piątym poziomie łup przestawał mieć znaczenie.
Opisuje to [Łup](#łup).
