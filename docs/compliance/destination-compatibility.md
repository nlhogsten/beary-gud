# Restricted destination compatibility dossier

Status: internal product, legal, and conformance research; not product-facing copy.

Last verified: 2026-08-05. Destination behavior and policies can change. Recheck primary sources and execute destination-specific import tests before release. This record is technical research, not legal advice.

This is the only repository document where destination and publisher names are intentionally used. Public components continue to use target-neutral VOXL identities under [ADR 0006](../architecture/decisions/0006-target-neutral-identities.md).

## Minecraft compatibility research

### What is common and what varies

- A modern Minecraft character skin commonly uses a `64x64` texture atlas with base and outer layers. VOXL represents this baseline with `wide-arm-64` and `slim-arm-64`.
- Minecraft's official skin overview distinguishes a classic/wide model with four-pixel-wide arms from a slim model with three-pixel-wide arms. This supports keeping arm geometry explicit rather than guessing from a character concept: [What is a Minecraft skin?](https://www.minecraft.net/en-us/article/what-is-minecraft-skin)
- The current Microsoft Creator Tools skin-pack validator explicitly allows skin images that are `64x64` or `128x128`. This is the primary evidence for VOXL's initial higher-density profiles: [CSPJ skin-pack validation rules](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/mctoolsvalreference/cspj?view=minecraft-bedrock-stable)
- Microsoft documents the structure and packaging of Bedrock skin packs separately from the image itself: [Introduction to skin packs](https://learn.microsoft.com/en-us/minecraft/creator/documents/skinpack?view=minecraft-bedrock-stable)
- Microsoft also documents geometry identifiers and texture dimensions for Bedrock geometry content. Custom geometry support is a separate format/capability and must not be inferred from ordinary player-skin support: [Geometry JSON reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/geometry.v1.12.0?view=minecraft-bedrock-stable)

### Higher detail is not one universal format

`128x128` supplies four times as many texels as `64x64`, but it does not change body proportions. Whether a particular Minecraft edition, server, upload route, pack format, or mod accepts those pixels is a destination-adapter question. The Bedrock validator evidence must not be generalized to every Java upload path without a separate import test.

Community modifications can enable other behaviors:

- HD Skins describes support for resolutions higher than the normal Mojang skin path. Those files require the relevant mod/service ecosystem and are not a safe default export promise: [HD Skins](https://modrinth.com/mod/hd-skins)
- 3D Skin Layers converts the normally flat outer skin layer into extruded geometry. That changes presentation, not necessarily texture density: [3D Skin Layers](https://modrinth.com/mod/3dskinlayers)

### VOXL neutral mapping

| Destination fact | VOXL identity | Product consequence |
| --- | --- | --- |
| Four-pixel arm model | `wide-arm-*` | Geometry is four model units wide at either density. |
| Three-pixel arm model | `slim-arm-*` | Geometry is three model units wide at either density. |
| `64x64` atlas | `*-64` | Baseline density and current Phase 5 evaluation format. |
| `128x128` atlas | `*-128` | Higher-density deterministic document/export support; provider quality is not yet evaluated. |
| Extruded outer layer | Renderer capability | Do not encode it as density or a new artifact identity. |
| Custom destination geometry | Future adapter or engine decision | Do not silently reinterpret an ordinary humanoid-skin document. |

## Required release evidence

Before claiming compatibility for a destination path:

1. Pin the edition, upload/import path, version, geometry variant, atlas density, layer behavior, and packaging requirements.
2. Export a deterministic fixture from VOXL and import it through the real destination path.
3. Compare front, rear, both sides, top, bottom, arms, legs, seams, overlay transparency, and pixel sharpness.
4. Record screenshots or video, exported hashes, destination version, result, and any account/mod/pack prerequisites.
5. Repeat the test for every advertised profile. A pass for `wide-arm-64` does not prove `slim-arm-128`.
6. Keep trademark usage and marketing wording under separate legal review.
