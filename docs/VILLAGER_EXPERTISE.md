# Villager aptitude and expertise decisions

Villagers should feel like people the player is assigning, not interchangeable counters. A person can be useful now, become better through supported work, and still be worth moving when the settlement's needs change.

This document records the product direction. Current behavior and validation live in the playable build and its checks; exact values, save fields, formulas, and test measurements do not belong here.

## Aptitude

- Every person has one small permanent aptitude for an occupation.
- Aptitude improves that person's contribution in the matching occupation.
- Aptitude has no negative counterpart and does not restrict other work.
- New arrivals receive their aptitude when they arrive. The result persists through reassignment, removal of a workplace, and reload.
- The founder has a useful starting aptitude so the first settlement is immediately legible.

## Expertise

- Expertise is separate for each occupation. Skill learned while foraging does not make someone an experienced farmer.
- Productive work earns expertise only when the workplace is supported by the settlement's inputs and conditions.
- Expertise grows with diminishing returns. It should reward continuity without making a new worker or a new occupation worthless.
- Expertise survives reassignment, creating a tradeoff between keeping a specialist and meeting a new bottleneck.
- Builders follow the same learning principles as other productive occupations.

## Staffing

- Plus and Fill help with routine allocation by choosing suitable available people.
- Minus releases the least useful assigned contributor for that occupation.
- Deliberate individual reassignment remains available in the People view.
- Automatic arrivals remain unassigned. The game never silently moves existing workers to make room for them.
- Efficient staffing is a soft guide. Additional people can still contribute, with diminishing returns from workplace capacity and crowding.

## Player feedback

- People rows show identity, health, occupation, current contribution, aptitude, and optional expertise detail.
- Return summaries may call out meaningful expertise gains without interrupting play.
- The interface should show why a worker is useful or why a workplace is slowing down through local state and numbers, not hover-only explanations.

## Boundaries

The feature does not add relationships, personality disadvantages, fatigue systems, training buildings, training currencies, injuries, hiring screens, rerolls, mentoring bonuses, or attendance deadlines. Those systems would need a separate decision and a clear contribution to the settlement loop.
