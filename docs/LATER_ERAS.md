# Later eras and the time box

Design extension implemented on 19 October 2026, following the user's decision to design and implement the open content in [draft 0.2](GAME_DESIGN_DETAILS.md). This addendum resolves its later numerical catalogs, late specialization upgrades, space observation identity, time-box discovery, and current research frontier. The earlier draft remains the source for shared formulas and the first three eras. [Validation results](IMPLEMENTATION_RESULTS.md) distinguish reachability evidence from balance conclusions.

## Progression and choices

All eight eras are playable. Mechanization opens industry; Electronics opens digital production; Orbital flight opens space; Quantum engineering opens quantum production; Causal engineering opens the final era. Every transition uses resources obtainable in the preceding era. A Launch complex is a constructed prerequisite for orbital extraction, surveying, habitats, and observation; this makes space investment a construction decision alongside its research. It does not impose land management or a third queue.

Industry shifts labor into ore, metal, and machinery, then offers voluntary mechanical conversions. Digital production makes electricity a stored ingredient, **Charge**, with battery investment competing against consumers. Computing converts knowledge and circuits into data, so more analysts can reduce the research stockpile. Space introduces exotic material and a fuel-free solar conversion: solar generation is a deliberate investment that releases the wood supply. Quantum fabrication improves earlier manufacturing with diminishing bonuses. Beyond quantum offers a second metal route, more efficient machine production, and causal models as both construction material and a small repeating manufacturing input.

Forestry extends into lean and closed-cycle fabrication: selected recipes use 80%, then another 85%, of their inputs, for a combined 68%. Stonecraft extends into structural systems and resilient megastructures: housing contributions and storage multiply by 1.20, then 1.25. Existing early branch effects remain. Common discoveries require neither branch upgrade. Extra capacity relieves crowding and storage pressure; ingredient efficiency relieves upstream labor and material demand. They do not change project costs or make production free.

**Deep-space array** is the non-prestige observation facility. Its knowledge technology bonus and offline benefit use √level. The earlier Observatory remains an optional reward for the Early astronomy perk; no space transition requires prestige.

**Causal synthesis** is the last finite discovery in this catalog. It unlocks a faster and more efficient causal laboratory form. There is no victory reset or forced ending: facilities, storage, equipment, population, offline preparation, and optional prestige remain useful investments with the existing soft curves. Further narrative endings and new eras are outside this catalog.

## Time-box discovery and prestige

Mechanization → Precision instruments → **Chronometry**. Chronometry costs 2,000 knowledge, 120 metal, and 40 machinery and takes 120 base minutes. Completing its paid research reveals a physical instrument that records tomorrow before it happens: the mysterious time box. This is a technological discovery, not a random reward or an opening gift. Its deeper origin remains deliberately unexplained flavor, not a missing game rule.

The discovery is available in industry before spaceflight, but optional; players can skip it and advance normally. Once discovered it survives resets. Resetting requires Writing in the current run and an explicit loss/gain confirmation. It clears stock, people, workplaces, mastery, queues, research, specialization, and equipment, while retaining lifetime legacy, unspent points, perks, the time box, highest era, and arrival preference.

The draft's reward and permanent perk formulas are unchanged. Lifetime points provide `1 + 0.02 × √points` production/building/research speed, regardless of points spent. A first industrial reset earns at least 28 points from its era term, plus completed research; the available first perks offer either longer preparation, cheaper research, optional astronomy, or storage. Repeated resets require rebuilding to Writing. All common eras remain reachable without resetting. The relationship between short Writing resets and longer era runs needs human testing; there is no claim that prestige timing is optimally balanced.

## Resource sources

Rates are units per minute per healthy worker before level, equipment, staffing, happiness, technology, specialization, prestige, and storage multipliers. Each completed cycle produces exactly one unit and pays the listed recipe. Missing ingredients pause work; fractional recipes retain full precision. Later forms may replace the recipe.

| Resource | Initial comfort | First source | Base rate | Inputs per unit |
| --- | --- | --- | --- | --- |
| Ore | 100 | Ore mine | 6 | None |
| Metal | 50 | Foundry | 2 | 3 ore, 1 wood |
| Machinery | 10 | Machine shop | 0.25 | 3 metal, 1 tools |
| Charge | 100 | Generator | 12 | 0.5 wood |
| Circuits | 20 | Electronics plant | 0.5 | 2 metal, 3 charge |
| Data | 50 | Computing center | 1 | 1 knowledge, 1 circuits, 2 charge |
| Exotic material | 10 | Orbital extractor | 0.25 | 4 charge |
| Quantum components | 5 | Quantum laboratory | 0.1 | 2 exotic material, 5 data, 10 charge |
| Causal models | 5 | Causal laboratory | 0.05 | 2 quantum components, 10 data, 20 charge |

## Research catalog

Costs pay once when the research queue starts; time is divided by the prestige multiplier. The Efficient instruction perk applies its existing 10% cost reduction. “+” means all prerequisites. Branch prerequisites enforce the existing permanent choice.

| Research | Prerequisites | Materials | Minutes | Result |
| --- | --- | --- | --- | --- |
| Powered workshops | Mechanization | 1200 knowledge, 100 metal, 30 machinery | 90 | Unlock mechanical extraction, processing, and tool workshop forms. |
| Precision instruments | Mechanization | 1400 knowledge, 80 metal, 20 machinery, 50 tools | 90 | Unlock Chronometry and a controlled investigation of time. |
| Chronometry | Precision instruments | 2000 knowledge, 120 metal, 40 machinery | 120 | Discover the mysterious time box and optional prestige. |
| Lean fabrication | Forestry + Mechanization | 1800 knowledge, 80 metal, 20 machinery | 90 | Toolmaker, machinist, and electronics recipe inputs ×0.80. |
| Structural systems | Architecture + Mechanization | 1800 knowledge, 100 metal, 30 machinery | 90 | Housing contribution and all storage thresholds ×1.20. |
| Electronics | Powered workshops | 3500 knowledge, 250 metal, 80 machinery, 100 tools | 180 | Enter the digital era; unlock power, electronics, batteries, and data storage. |
| Computing | Electronics | 2500 knowledge, 80 circuits, 500 charge, 40 machinery | 120 | Unlock Computing center, Research institute, and Technical archive. |
| Automation | Computing | 3500 knowledge, 300 data, 150 circuits, 80 machinery | 120 | Unlock Electric foundry and Automated machine shop. |
| Distributed records | Computing | 2500 knowledge, 300 data, 80 circuits | 90 | Full-speed offline window +4h; knowledge and data thresholds ×1.25. |
| Orbital flight | Automation + Distributed records | 5000 knowledge, 800 data, 200 machinery, 200 circuits, 1500 charge | 180 | Enter space; unlock Launch complex, Orbital extractor, Habitat, Cargo depot, and Deep-space array. |
| Orbital surveying | Orbital flight + Launch complex level 1 | 4000 knowledge, 600 data, 40 exotic material, 100 circuits | 120 | Unlock Orbital mining network; exotic extraction technology +20%. |
| Solar collection | Orbital flight | 3500 knowledge, 150 circuits, 30 exotic material, 60 machinery | 90 | Unlock Solar array: double base charge rate with no wood input. |
| Quantum engineering | Orbital surveying + Solar collection | 7000 knowledge, 1600 data, 120 exotic material, 300 circuits, 2000 charge | 240 | Enter the quantum era; unlock Quantum laboratory, fabricator, vault, and archives. |
| Coherent assembly | Quantum engineering | 5000 knowledge, 1000 data, 30 quantum components, 100 machinery | 120 | Quantum component production technology +25%; unlock Quantum habitat. |
| Closed-cycle fabrication | Lean fabrication + Quantum engineering | 6000 knowledge, 1000 data, 40 quantum components | 120 | Toolmaker, machinist, and electronics recipe inputs multiply by a further 0.85. |
| Resilient megastructures | Structural systems + Quantum engineering | 6000 knowledge, 1000 data, 40 quantum components | 120 | Housing contribution and all storage thresholds multiply by a further 1.25. |
| Causal engineering | Coherent assembly | 8000 knowledge, 2000 data, 200 exotic material, 120 quantum components, 3000 charge | 240 | Enter beyond quantum; unlock Causal laboratory and Temporal vault. |
| Stellar synthesis | Causal engineering | 7000 knowledge, 1200 data, 30 causal models, 60 quantum components | 180 | Unlock Stellar foundry, a high-output metal route using exotic material and charge. |
| Causal archives | Causal engineering | 7000 knowledge, 1500 data, 25 causal models, 200 circuits | 120 | Unlock Causal archive and Causal data center; full-speed offline window +4h. |
| Predictive fabrication | Stellar synthesis + Causal archives | 10000 knowledge, 2500 data, 60 causal models, 250 machinery | 180 | Unlock Predictive machine shop; selected processing technology +20%. |
| Causal synthesis | Predictive fabrication | 12000 knowledge, 4000 data, 80 causal models, 150 quantum components | 240 | Unlock Causal synthesis lab: faster models with reduced recipe inputs. Continue expanding without a final reset requirement. |

## Facilities and forms

Materials and work below are level-one bases, using the draft's shared cumulative polynomial `G(L)`. Expansion pays the difference between rounded cumulative investments. Conversion pays the positive material difference and work difference between the old and selected forms at the current level. Old effects persist until completion; level, equipment, workers, and partial cycles remain. No completed investment is refunded. Rates shown here replace the preceding form's base rate; listed storage replaces its storage vector and scales with `G(L)`. Housing scales linearly with level. A later form need not retain every storage category: the Causal archive trades its Data contribution for Knowledge and Causal model storage; the Data center can take over that role.

| Facility / form | Prerequisites | Base materials | Base work | Effect |
| --- | --- | --- | --- | --- |
| Ore mine | Mechanization | 80 planks, 60 blocks, 20 tools | 20 | 6/min ore; Recipe: None |
| Foundry | Mechanization | 60 planks, 100 blocks, 30 tools | 30 | 2/min metal; Recipe: 3 ore, 1 wood |
| Electric foundry | Automation | 100 metal, 30 machinery, 30 circuits | 45 | 6/min metal; Recipe: 3 ore, 1 charge |
| Machine shop | Mechanization | 80 planks, 80 blocks, 40 metal, 20 tools | 30 | 0.25/min machinery; Recipe: 3 metal, 1 tools |
| Automated machine shop | Automation | 150 metal, 40 machinery, 50 circuits | 45 | 0.75/min machinery; Recipe: 3 metal, 1 tools, 2 charge |
| Predictive machine shop | Predictive fabrication | 300 metal, 30 quantum components, 20 causal models | 70 | 1.5/min machinery; Recipe: 2 metal, 0.5 tools, 1 charge, 0.01 causal models |
| Generator | Electronics | 100 metal, 30 machinery, 60 blocks | 30 | 12/min charge; Recipe: 0.5 wood |
| Solar array | Solar collection | 150 metal, 80 circuits, 20 exotic material | 45 | 24/min charge; Recipe: None |
| Electronics plant | Electronics | 100 metal, 20 machinery, 40 tools | 30 | 0.5/min circuits; Recipe: 2 metal, 3 charge |
| Computing center | Computing | 80 metal, 60 circuits, 20 machinery | 30 | 1/min data; Recipe: 1 knowledge, 1 circuits, 2 charge |
| Battery bank | Electronics | 80 metal, 60 blocks, 20 tools | 20 | Storage: 4000 charge |
| Data center | Electronics | 80 metal, 20 machinery, 80 blocks | 25 | Storage: 400 circuits, 1000 data, 1000 knowledge |
| Causal data center | Causal archives | 200 circuits, 30 quantum components, 20 causal models | 50 | Storage: 1200 circuits, 10000 data, 3000 knowledge, 400 causal models |
| Launch complex | Orbital flight | 80 machinery, 80 circuits, 1000 charge, 200 metal | 60 | Technology: Orbital worker +10% × √level |
| Orbital extractor | Orbital flight + Launch complex level 1 | 60 machinery, 80 circuits, 600 charge | 40 | 0.25/min exotic material; Recipe: 4 charge |
| Orbital mining network | Orbital surveying | 120 machinery, 150 circuits, 20 exotic material | 70 | 1/min exotic material; Recipe: 6 charge |
| Cargo depot | Orbital flight | 40 machinery, 80 circuits, 300 metal | 30 | Storage: 400 exotic material, 400 machinery, 800 circuits, 50 quantum components |
| Deep-space array | Orbital flight + Launch complex level 1 | 40 machinery, 100 circuits, 200 metal | 40 | Technology: Scholar +10% × √level; Offline +1 × √level hours |
| Quantum laboratory | Quantum engineering | 80 machinery, 150 circuits, 30 exotic material, 300 data | 50 | 0.1/min quantum components; Recipe: 2 exotic material, 5 data, 10 charge |
| Quantum fabricator | Quantum engineering | 100 machinery, 150 circuits, 20 quantum components, 300 data | 50 | Technology: Sawyer +15% × √level, Mason +15% × √level, Toolmaker +15% × √level, Machinist +15% × √level, Electronics worker +15% × √level, Quantum engineer +15% × √level |
| Quantum vault | Quantum engineering | 200 metal, 100 circuits, 20 exotic material | 40 | Storage: 300 quantum components, 600 exotic material, 100 causal models |
| Temporal vault | Causal engineering | 200 circuits, 40 quantum components, 600 data | 65 | Storage: 900 quantum components, 1200 exotic material, 600 causal models |
| Causal laboratory | Causal engineering | 80 machinery, 100 circuits, 30 quantum components, 500 data | 60 | 0.05/min causal models; Recipe: 2 quantum components, 10 data, 20 charge |
| Causal synthesis lab | Causal synthesis | 150 machinery, 80 quantum components, 40 causal models | 90 | 0.12/min causal models; Recipe: 1 quantum components, 8 data, 12 charge |
| Stellar foundry | Stellar synthesis | 150 machinery, 60 quantum components, 20 causal models, 100 exotic material | 90 | 30/min metal; Recipe: 0.1 exotic material, 2 charge |
| Mechanical timber yard | Powered workshops | 40 planks, 30 blocks, 20 metal, 5 machinery | 12 | 8/min wood; Recipe: None |
| Mechanical quarry | Powered workshops | 30 planks, 40 blocks, 20 metal, 5 machinery | 12 | 6/min stone; Recipe: None |
| Mechanical sawmill | Powered workshops | 50 planks, 40 blocks, 25 metal, 10 machinery | 12 | 1.5/min planks; Recipe: 3 wood |
| Mechanical stoneworks | Powered workshops | 40 planks, 50 blocks, 25 metal, 10 machinery | 12 | 1.5/min blocks; Recipe: 3 stone |
| Mechanical tool workshop | Powered workshops | 40 planks, 30 blocks, 30 metal, 10 machinery | 15 | 0.3/min tools; Recipe: 2 planks, 1 blocks |
| Ore stockyard | Mechanization | 100 planks, 80 blocks, 20 tools | 10 | Storage: 1000 wood, 1000 stone, 600 ore |
| Warehouse | Mechanization | 120 planks, 100 blocks, 30 tools | 12 | Storage: 500 planks, 500 blocks, 200 tools, 400 metal, 100 machinery |
| Research institute | Computing | 100 metal, 30 machinery, 50 circuits | 20 | 2.25/min knowledge; Recipe: 1 food |
| Technical archive | Computing | 200 metal, 50 machinery, 30 circuits | 15 | Storage: 1800 knowledge |
| Quantum archive | Quantum engineering | 250 metal, 100 circuits, 40 exotic material, 200 data | 25 | Storage: 4000 knowledge, 2000 data; Offline +1 × √level hours |
| Causal archive | Causal archives | 200 circuits, 50 quantum components, 20 causal models | 40 | Storage: 9000 knowledge, 300 causal models; Offline +2 × √level hours |
| Habitat | Orbital flight + Launch complex level 1 | 120 metal, 20 machinery, 30 circuits | 25 | 16 base places/level |
| Quantum habitat | Coherent assembly | 200 metal, 50 circuits, 10 quantum components | 40 | 24 base places/level |

Descriptions live alongside the mechanical definitions and are shown separately in the interface. Resource tooltips explain stock and pressure; conversion details show the replacement base rate, recipe, storage, housing, or offline effect before the player commits.
