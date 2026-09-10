# Sparbird

**Walk in having already had the conversation.**

You get one shot at the meeting that matters. Sparbird gives you a second one, first.

Pick the kind of person you are about to face. Your phone rings, they pick up, and they push
back the way they will on the day. Five minutes later you know exactly which line lost them,
because it is quoted back to you.

Sparbird only ever calls you. There is no contact list, and no way to point it at anybody else.

---

## Try it without spending anything

```bash
pnpm install
cp .env.example .env
pnpm e2e:dry
```

That replays real calls that already happened, scored the same way a live one is. No key, no
network, no phone ringing. Then `pnpm dev` and open http://localhost:3000 to see it as a person
would use it.

## When you want the phone to ring

Put three things in `.env`:

| | |
| --- | --- |
| `CALLE_API_KEY` | your key from the CALL-E dashboard |
| `OWNER_E164` | your own phone, like `+919876543210` |
| `SPARBIRD_LIVE` | `1`, and only when you mean it |

Then take a call from the app, or from a terminal:

```bash
pnpm drill first-principles-investor
```

It shows you who is calling and which number will ring, and waits for you to say yes.

## What it will not do

It will not call anyone but you. The number in `OWNER_E164` is the only destination, and a
drill that somehow resolves to a different one stops before the call is built.

It will not pretend to be a real person. Every call opens by saying out loud that it is a
rehearsal, and that line cannot be edited or removed.

It will not grade a call that did not happen properly. If the line drops or the service returns
something it cannot back up, you get told that, not a bad score.

It will not run anything in the background. No schedule, no queue, no surprise calls. One call
happens when you press the button, and hanging up ends it.

More detail on all of this in [SAFETY.md](SAFETY.md).

## How the scoring actually works

Two layers, and the second one is not allowed to flatter you.

The first is arithmetic on the call's own timestamps: how much of it you talked, how long before
you said a real number, whether you got back to your point after being cut off.

The second is the rubric. Each item scores only when a line of the transcript proves it, quoted
word for word. If nothing proves it, the note says the call did not show it rather than saying
you failed. That is why a score always reads as "3 of 4 things landed" and never as a bare
percentage.

There is a third thing worth knowing. The call service returns its own summary of how the call
went, and sometimes that summary does not match the recording. When the two disagree, Sparbird
keeps the recording, says so on the page, and scores from what was actually said.

## What is in here

```
personas/            the people you can practise against
fixtures/            real calls, recorded, so anything can be tried without spending a call
src/app/             the app
src/lib/persona.ts   turns a person into the brief the caller is given
src/lib/calle.ts     places the call, and refuses any number but yours
src/lib/score.ts     the scoring, and the disagreement check
src/lib/judge.ts     reads the transcript, offline by default
extension/           optional: builds a persona from the profile page you are looking at
```

Built on [CALL-E](https://github.com/CALLE-AI/call-e-integrations). MIT licensed.
