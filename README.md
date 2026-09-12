# Sparbird

**Practise the hard call by actually having it.**

You get one shot at the meeting that matters. Sparbird gives you a second one, first.

Pick the kind of person you have to win over. Sparbird rings your phone and plays them: they
interrupt, they push back, they are not easily impressed. When you hang up, every line you said
is marked with what worked and what cost you.

It rings one number, the one saved on your own account. There is no list to upload and no way to
dial anybody else.

**Live:** https://sparbird-nsi2jfswta-uc.a.run.app (Cloud Run, scales to zero, so the first load takes a moment). The public copy replays recorded calls and cannot ring anyone. To hear your own phone ring, run it on your machine.

---

## Try it without spending anything

Node 22 or newer, and pnpm.

```bash
pnpm install
cp .env.example .env
pnpm dev            # http://localhost:3000
```

Nothing rings. Every caller replays a real call that already happened, scored exactly the way a
live one is. To watch that happen in a terminal instead of a browser:

```bash
pnpm e2e:dry        # replays all of them and checks the scoring still holds
```

| | |
| --- | --- |
| `pnpm preflight` | can this machine place a call right now, and if not, what is in the way |
| `pnpm dev` | the app, on port 3000 |
| `pnpm build && pnpm start` | the production build |
| `pnpm e2e:dry` | replay every recorded call, no key and no network |
| `pnpm drill <persona-id>` | take one call from the terminal |
| `pnpm typecheck` | tsc, no emit |

## When you want the phone to ring

Three things have to be true, and the app tells you which one is missing at `/settings`.

**Your number** is not a setting on the server, it is on your account. Sign up at `/signup`, or
add it later at `/settings`. An account without one cannot place a call.

**A CALL-E key**, in `.env` as `CALLE_API_KEY`, from the CALL-E dashboard.

**`SPARBIRD_LIVE=1`** in `.env`, and only when you mean it. Anything else, including empty, runs
on recorded calls so that nobody is rung by accident.

Then press the button on any caller, or from a terminal:

```bash
pnpm drill first-principles-investor
```

It shows you who is calling and which number will ring, and waits for you to say yes.

### Pinning the whole install to one phone

Set `OWNER_E164` to a number in E.164 form and that phone becomes the only phone this copy will
ever dial, whoever is signed in and whatever they saved on their account. That is what makes a
shared or public deployment harmless. Leave it unset and each account rings its own number.

## What it will not do

It will not call anyone but you. The destination is the number on your own account, or
`OWNER_E164` where that is set, and a drill that somehow resolves to a different one stops before
the call is built.

It will not pretend to be a real person. Every call opens by saying out loud that it is a
rehearsal, and that line cannot be edited or removed.

It will not grade a call that did not happen properly. If the line drops or the service returns
something it cannot back up, you get told that, not a bad score.

It will not run anything in the background. No schedule, no queue, no surprise calls. One call
happens when you press the button, and hanging up ends it.

More detail on all of this in [SAFETY.md](SAFETY.md).

## Your own audience

The three regulars are a start. The people you actually have to convince are on the page called
Your audience: paste what one of them says about themselves, or upload a CSV with a row per
person and get all of them on the line, up to fifty at a time. There is a sample file at
`public/sample-audience.csv` showing the columns. Every trait we give a person is shown next to
the words of theirs that produced it, so you can see the working and disagree with it. Nobody on
your list is ever dialed.

Before any call you can set how they come at you: the tone (warm, neutral, blunt, hostile) and
what they walked in wanting (curious, skeptical, on the fence, looking for a reason to say no).
Same person, different day. The caller listens to what you actually say and pushes back on it in
their own words, not on a script.

## How the scoring actually works

Two layers, and the second one is not allowed to flatter you.

The first is arithmetic on the call's own timestamps: how much of it you talked, how long before
you said a real number, whether you got back to your point after being cut off.

The second is the rubric. Each item scores only when a line of the transcript proves it, quoted
word for word. If nothing proves it, the note says the call did not show it rather than saying
you failed. That is why a score always reads as "3 of 4 things landed" and never as a bare
percentage.

After the score, every call gets a review in three columns: what worked, what hurt, and what to
watch. The third column is the one a sales manager would care about. It picks out a promise you
made on the line, an absolute you cannot back, a forecast with nothing behind it, pressure, or
running down the alternative, and it quotes your exact words with the time they were said. A flag
that cannot quote the transcript is thrown away.

There is a third thing worth knowing. The call service returns its own summary of how the call
went, and sometimes that summary does not match the recording. When the two disagree, Sparbird
keeps the recording, says so on the page, and scores from what was actually said.

## Where your calls are kept

SQLite, at `data/sparbird.db`, created the first time the app runs. Three tables: `attempts`
(every call with its transcript and its marking), `users`, and `enquiries` from the contact page.
Point it somewhere else with `SPARBIRD_DB=/some/path.db`. It is gitignored.

```bash
sqlite3 data/sparbird.db ".tables"
sqlite3 data/sparbird.db "SELECT persona_id, points, max_points FROM attempts;"
```

Set `SPARBIRD_EPHEMERAL=1` and there is no file at all: everything is held in memory and is gone
when the process stops. That is on by default on Cloud Run, Vercel and Lambda, which is why the
public copy forgets accounts between restarts. A deployment meant to remember people needs a
database that outlives the container.

## How it is put together

One Node process. The pages, the API and the engine all run in it, which is why the same code
runs from a terminal with no server at all.

```
BROWSER   /  ·  /from-profile  ·  /drill/[id]  ·  /attempt/[id]  ·  /calls
          /pricing  ·  /signup  ·  /signin  ·  /settings  ·  /contact
          server-rendered pages; one small client component starts a call
                                   │
SERVER    POST /api/drill  ·  /api/auth  ·  /api/account  ·  /api/persona  ·  /api/contact
          (place and score)        ▼          (accounts, personas, enquiries)
          ┌──────────────────────────────────────────────────────┐
          │  THE ENGINE, src/lib, plain TypeScript               │
          │  profile.ts   what they wrote → traits, with quotes  │
          │  persona.ts   persona → the brief the caller gets    │
          │  calle.ts     your number only; fixture unless LIVE  │
          │  score.ts     timings, rubric, does the summary      │
          │               match the recording                    │
          │  db.ts        SQLite at data/sparbird.db, or memory  │
          │               where the disk will not survive         │
          └──────────────────────────────────────────────────────┘
                                   │
OUTSIDE   CALL-E (only for a live call)   ·   an LLM (only if you turn the judge on)
```

## Deploying

The public copy runs in dry-run mode on purpose: no key, no phone number, so it can never ring
anyone. Live calls are for your own machine.

Cloud Run, from the repo root, once `gcloud auth login` is done and billing is on for the project:

```bash
PROJECT=sparbird scripts/deploy.sh
```

That enables the APIs, builds the [Dockerfile](Dockerfile) on Cloud Build, and rolls it onto a
service called `sparbird`. Run it again to ship a new version. The container keeps history in
memory and scores the recorded calls once at boot, so the page is never empty.

`SPARBIRD_SECRET` signs the session cookie. Set it to any long random string wherever the app
runs, or everyone is signed out whenever the process restarts. On Cloud Run it comes from Secret
Manager and the deploy script attaches it.

Any host that runs a container works the same way. Set `SPARBIRD_EPHEMERAL=1` wherever the disk
does not survive a restart.

## What is in here

```
data/sparbird.db     your calls, accounts and enquiries (gitignored, created on first run)
personas/            the people you can practice against
fixtures/            real calls, recorded, so anything can be tried without spending a call
src/app/             the app
src/lib/persona.ts   turns a person into the brief the caller is given
src/lib/calle.ts     places the call, and refuses any number but yours
src/lib/score.ts     the scoring, and the disagreement check
src/lib/judge.ts     reads the transcript, offline by default
extension/           optional: builds a persona from the profile page you are looking at
```

Built on [CALL-E](https://github.com/CALLE-AI/call-e-integrations). MIT licensed.
