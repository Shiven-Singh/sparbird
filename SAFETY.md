# Safety

Sparbird places real phone calls. This is what it will and will not do, and how each limit is
enforced in code rather than promised in prose.

## It dials one number: yours

A call has exactly one destination, and it is the phone on the account placing it. There is no
recipient list, no CSV import, no contact picker, and no multi-recipient path: `src/lib/calle.ts`
sends `recipient` in the singular because there is nowhere else for a second number to go.

`resolveDialNumber()` in `src/lib/mask.ts` picks it, and validates it as E.164 first. An account
with no number cannot place a call at all. The compiled task is then checked for that number
before the CALL-E client is constructed, and a drill that somehow resolves to another one throws
`SelfDialViolation` rather than dialling.

### Where OWNER_E164 fits, and what it is honest about

`OWNER_E164` is a lock. Where it is set, that phone is the only phone the install will dial,
whoever is signed in and whatever they saved. Nothing a user types can override it. Any
deployment more than one person can reach should set it.

Where it is not set, the number is typed by the person who will answer it, and the honest version
of that is: Sparbird trusts them. Saving one requires confirming out loud that it is your own
phone, and every call still announces itself in its first line, but a determined person could
type a number that is not theirs. That is a real gap, not a solved problem. Closing it properly
means verifying the number by calling it, which is not built yet. Until it is, the lock is the
control that actually holds, and the disclosure is what protects whoever picks up.

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
