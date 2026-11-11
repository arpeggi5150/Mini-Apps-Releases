# Arcana — v1.0.0

Tarot readings as a standalone web app. Open `index.html` in any browser — no build step, no dependencies.

## What it does

- Full 78-card deck: 22 Major Arcana (meanings reused from the Astrology App's old Cosmic Draw) + 56 Minor Arcana, upright and reversed.
- Spreads: One Card / Three Cards (Past / Present / Future) / Celtic Cross (10) / Horseshoe (7) / Daily Card.
- Flip animations + 3D cardstock feel; mandala tablecloth with sprout in 7 colours; 3 swappable card-back skins; "Read together" summary per spread.
- Faithful port of the Kami Garden tarot spec (in-game, built 1.2.136, fixed 1.2.144).

Thoth deck NOT included (copyright — permission email drafted, NOT sent, awaiting Zee).

## Godot version — DECIDED Nov 8 2026

Tarot is built ONCE as a Godot project (Web + Windows export); Kami Garden loads the same scene as an addon. `godot/` in this folder holds the skeleton; the HTML v1.0.0 stays as the lightweight fallback and the spec. Vault home for the Godot project is `programs/arcana/`.

## Install spots (systemwide rule, Zee Nov 7 2026)

1. Home folder — `programs/mini-apps/arcana-app/` — DONE
2. Command Center Mini-Apps — test.108 item 9 reads `programs/mini-apps/` (108 shipped Nov 8, but the Mini-Apps entry was reported missing in CC Nov 10, cause not yet established)
3. Public repo — `arpeggi5150/Mini-Apps-Releases` — PUBLISHED Nov 10 2026 (v1.0.0, with Astrology v1.3.0)
4. Linktree — ZeeCreationsHQ — TBD
5. Public web (Firebase) — DEFERRED
