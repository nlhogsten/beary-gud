# VOXL documentation guide

Start here. This directory is organized by purpose so that status, architecture, research, operating instructions, and historical evidence do not compete as peer files.

## Current project state

- [Build progress](planning/progress.md) is the day-to-day status source of truth.
- [Implementation plan](planning/implementation-plan.md) is the delivery specification and phase gate.
- [System architecture](architecture/system.md) defines the accepted client, service, engine, provider, data, and infrastructure boundaries.
- [Generation research](research/generation/README.md) identifies the current generation hypothesis and points to every alternative considered.

The current generation hypothesis is **template-conditioned managed image generation for fixed geometry**. It must pass the documented preflight and full evaluation before it becomes Phase 6 implementation. No provider is admitted, no paid call is authorized, and no GPU or self-hosted model infrastructure is planned.

## Read by task

| If you need to… | Read first | Then read |
| --- | --- | --- |
| Understand what VOXL is | [Product research](research/product.md) | [Glossary](reference/glossary.md) |
| See what is done or next | [Progress](planning/progress.md) | [Implementation plan](planning/implementation-plan.md) |
| Change a system boundary | [System architecture](architecture/system.md) | [Decision records](architecture/decisions/README.md) |
| Work on generation | [Current generation direction](research/generation/README.md) | [Method catalog](research/generation/method-catalog.md) and [experiment/build gates](research/generation/experiment-plan.md) |
| Run the project locally | [Local development](development/local-development.md) | [Troubleshooting](development/troubleshooting.md) |
| Verify Studio behavior | [Studio verification](quality/studio-verification.md) | Current [progress claim](planning/progress.md) |
| Use the existing product | [Usage guide](guides/usage.md) | [Animation guide](guides/animation.md) |
| Work with AI editors | [AI workflow](development/ai-workflow.md) | Repository `AGENTS.md` and the routed skill |
| Check destination compatibility | [Compliance record](compliance/destination-compatibility.md) | Relevant export profile and decision record |

## Directory map

```text
docs/
├── README.md                         this navigation guide
├── architecture/
│   ├── system.md                     accepted system boundaries
│   └── decisions/                    numbered architecture decisions
├── planning/
│   ├── progress.md                   checked status and evidence
│   └── implementation-plan.md        phased delivery specification
├── research/
│   ├── product.md                    product, market, provider, and source research
│   └── generation/
│       ├── README.md                 current hypothesis and decision ladder
│       ├── method-catalog.md          all generation approaches considered
│       └── experiment-plan.md         preflight, thresholds, and build sequence
├── development/                      local operation and contributor workflows
├── guides/                           user-facing workflow guides
├── quality/                          browser and evidence-based verification
├── reference/                        shared vocabulary
└── compliance/                       restricted destination-specific evidence
```

## Documentation rules

- Update `planning/progress.md` only when the stated evidence exists.
- Change accepted system boundaries through a numbered decision record.
- Keep provider and destination brands in research, provenance, or compliance records; keep public engine and component identities target-neutral.
- Record a generation method in the catalog before implementing it. Record its experiment, thresholds, authority gates, and stop conditions before any provider call.
- Prefer links to one canonical record over duplicating status or policy across multiple documents.
- Move superseded reasoning into a decision record or mark it explicitly; do not leave two documents claiming to be authoritative.
