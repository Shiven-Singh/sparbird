# Sparbird

**Rehearse the call before the real one.**

Sparbird turns a person you are about to pitch into a phone call you can practise against.
Pick an archetype, or paste the bio of the specific buyer, investor, or hiring manager you are
meeting. [CALL-E](https://github.com/CALLE-AI/call-e-integrations) rings **your** phone, plays
that counterpart, pushes back where a real one would, and hangs up. Sparbird then scores the
attempt against the transcript and shows you the moment the pitch worked or died, quoted.

The only number Sparbird will ever dial is the one in `OWNER_E164`. There is no recipient list,
no campaign, and no way to point it at somebody else.

---

## What it does

1. **Compile a persona.** An archetype (`personas/*.json`) or a pasted bio becomes a persona spec:
   speaking style, a hidden state the persona reveals only under pressure, scripted objections,
   and the rubric that says what earns points.
2. **Place one call.** The spec compiles into a CALL-E task plus a `resultSchema`, and the call
   goes to your own phone. The persona opens by disclosing that it is a simulation.
3. **Score against evidence.** Deterministic metrics come from the transcript's turn offsets.
   Rubric items are judged separately, and an item scores only when the judge can quote the turn
   that proves it. Anything unproven is reported as unproven, not as a zero.

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm e2e:dry        # full pipeline on recorded fixtures. No API key, no call, no cost.
pnpm dev            # http://localhost:3000
```

`pnpm e2e:dry` is the honest way to see what this does. It runs persona compile, result parsing,
and scoring against the transcripts in `fixtures/transcripts/`, and never touches the network.

## Placing a real call

Live calls are off by default. To place one you must do all three:

1. Set `CALLE_API_KEY` to a key from the CALL-E dashboard.
2. Set `OWNER_E164` to your own number in E.164 form, for example `+919876543210`.
3. Set `SPARBIRD_LIVE=1`.

```bash
pnpm drill first-principles-investor
```

The command prints the compiled task and the masked destination, then waits for you to confirm
before it dials. With `SPARBIRD_LIVE` unset it prints the same preview and stops.

## Side effects

| Effect | When | How to stop it |
| --- | --- | --- |
| One outbound phone call to `OWNER_E164` | Only with `SPARBIRD_LIVE=1` and an explicit confirm | Unset `SPARBIRD_LIVE`, or hang up |
| One CALL-E call charged to your account | Same | Same |
| One LLM request for rubric judging | Only when `JUDGE_PROVIDER` is not `stub` | Leave `JUDGE_PROVIDER=stub` |
| A row written to the local SQLite file | After any drill, live or dry | Delete `data/sparbird.db` |

There are no recurring jobs, no scheduler, and no background workers. Every call is one explicit
command or one button press. Nothing is queued for later.

## Cancellation

Hang up. The attempt closes and is stored as `unscored` with the reason recorded. A call that is
cancelled, fails, or returns an outcome that cannot be read from the transcript is never scored as
a bad pitch, because a dropped line says nothing about how you did.

## Credentials

Keys are read from the environment only. `.env` is gitignored, `.env.example` holds placeholders,
and nothing is hard-coded. Phone numbers are masked wherever they are printed or stored
(`+91 •••• ••3210`). Transcripts are stored locally; when a persona was built from a real person's
bio, only their initials and role are kept.

## Repository layout

```
personas/            archetype specs and one fictional sample profile
fixtures/transcripts recorded calls that power the dry run and the tests
src/lib/persona.ts   spec to CALL-E task and result schema
src/lib/calle.ts     SDK wrapper, self-dial guard, fixture fallback
src/lib/score.ts     deterministic metrics, rubric scoring, contradiction check
src/lib/judge.ts     pluggable rubric judge (stub by default)
src/lib/db.ts        local SQLite store
src/app/             the web UI
extension/           optional MV3 extension that reads the profile page you are viewing
scripts/             drill runner and the dry-run end to end check
```

## Status

Built for the CALL-E hackathon, September 2026. The scoring engine, persona compiler and safety
guards are the parts worth reusing.
