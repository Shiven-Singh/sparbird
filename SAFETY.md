# Safety

Sparbird places real phone calls. This is what it will and will not do, and how each limit is
enforced in code rather than promised in prose.

## It dials one number: yours

`OWNER_E164` is the only destination. `src/lib/calle.ts` validates it as E.164 at startup and
refuses to build a call whose recipient is anything else. There is no recipient list, no CSV
import, no contact picker, and no multi-recipient path. A drill that somehow resolves to another
number throws `SelfDialViolation` before the CALL-E client is constructed.

This is the reason Sparbird needs no consent flow: the person consenting, the person dialing and
the person answering are the same person.

## Live calls are opt-in twice

A call happens only when `SPARBIRD_LIVE=1` **and** the operator confirms the masked destination at
the prompt. With the flag unset, every path returns a recorded fixture and the network is never
touched. The deployed demo runs with the flag unset and therefore cannot dial at all.

## Every call discloses itself

The compiled task begins with a fixed line the persona must say first:

> Heads up, this is a simulated practice persona, not a real person.

The line is injected by the compiler and is not a field a persona file can override or remove.

## Personas are styles, not people

Archetypes describe a manner of speaking ("interrupts any answer without a number in it"), not an
identity. A persona built from a real person's bio keeps their initials and role and drops their
name. Sparbird does not claim to be a specific named individual on a call, and the persona is
instructed never to assert that it is a real person.

## Third-party data stays local

The optional extension reads the profile page already open in your browser and posts it to your
own `localhost`. Nothing is sent anywhere else and nothing is stored in the extension. When a
persona is derived from a bio, only initials, role and inferred objections are persisted. The
source text is not written to disk.

## Content boundaries

The compiler appends a standing instruction to every task: the persona does not give medical,
legal or financial advice, does not discuss a real third party, and ends the call politely at the
persona's `max_minutes`.

## Unknown outcomes fail closed

A call that fails, is canceled, returns an unrecognised status, or returns a structured result
that contradicts its own transcript is recorded as `unscored` with the reason attached. It is
never folded into a score. Scores are reported as "n of m rubric items with evidence" so a
partial read is visible as a partial read.

## What has not been tested

The persona instructions have not been evaluated against CALL-E's content screening for every
archetype. If a persona is refused, Sparbird reports the refusal rather than retrying with softer
wording, and the refusal is worth reporting upstream.
