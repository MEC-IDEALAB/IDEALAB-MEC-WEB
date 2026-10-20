# Content and asset provenance

Evidence reviewed 20 October 2026. Distinguish freshly verified official documents, user-supplied official-site copy and inaccessible live CMS content. Existing page design was not copied.

| Content / asset | Source and context |
| --- | --- |
| IDEA Lab logo | https://idealab.mec.ac.in/image.png — used by official site header/footer as AICTE IDEA Lab. Saved unchanged to `public/brand/idea-lab.png`. |
| MEC crest | https://idealab.mec.ac.in/clglogo.png — official IDEA Lab footer college logo linking to MEC. Saved unchanged to `public/brand/mec.png`. |
| Name/location/contact | https://idealab.mec.ac.in/ and its served JS bundle: Model Engineering College, Thrikkakara, Kochi, Kerala 682021; idealab@mec.ac.in. |
| College identity | https://www.mec.ac.in/ and its served navigation assets. |
| Typography | Google Fonts official repository, pinned commit `47d54ca1ebb14fd864695f1d39dc734f39017c33`; Space Grotesk and DM Sans. Font-specific OFL licenses retained beside binaries. |

Official source usage does not establish a transferable license to the logos; use here is for the requested institutional website. Preserve identity, aspect ratio and attribution. Published facility descriptions are institutional editorial content, not verified live inventory, equipment availability, stock, capacity, pricing or booking data. Detailed facility names supplied by the user were not independently verified against the current CMS.

The root Flutter files named as fonts contain HTML. They were left untouched; only the web project uses repaired font assets. The decorative homepage machine drawing is code-native illustration, not evidence of a specific installed machine.

## Institutional content and facility additions

- [AICTE offer letter](https://www.mec.ac.in/model_media/notifications/AICTE-offer_letter.pdf) confirms programme selection on 30 March 2022; `/explore` summarizes this as March 2022.
- [Official FDP brochure](https://www.mec.ac.in/model_media/notifications/AICTE_IDEA_LAB_FDP_Brochure_24-11-203.pdf) supports joint AICTE/CogniCor support and broad facility types.
- `src/content/lab.ts` holds 11 published facility entries from the user’s copy of the official IDEA Lab website. This is a curated directory, not a fresh CMS check or operational service catalog. `/lab` displays all 11; the homepage features three facility images. No current team-role or stock/access claim is seeded.
- Two fresh Firecrawl homepage reads returned only a loader, including a four-second wait; the web reader returned blank. These attempts did not verify current CMS records.
- The supplied attachment `C:/Users/PC/.codex/attachments/fda9f184-71c2-49a6-b46e-52280d2bc586/Pasted text.txt` contains 29 historical event entries with month/day/year dates. Public content uses only three broad activity themes; no individual event records were published, preserving the signed-in-record policy.

Facility PNGs were downloaded unchanged from the user-supplied URLs to `public/facilities/`:

| Local asset | Supplied source |
| --- | --- |
| `epilog.png` | https://images.ctfassets.net/gqdozd79aet8/1aFCVEJxtCzimLHJ4GGJ54/eeb3135a698e65104de23b7f046eda27/epilog1.png |
| `snapmaker.png` | https://images.ctfassets.net/gqdozd79aet8/2yPBAZqdaR3AOEzF9G6tiW/b54bcb9d47a249eafadf4209136d9b08/Snapmaker_3_zY783ID.png |
| `ultimaker.png` | https://images.ctfassets.net/gqdozd79aet8/3U7H9wQNhu9Tve2CZA23Wv/0ca4f3c03812a1eb1209812d290fac17/ultimaker6.png |

These are supplied institutional reference assets; their presence does not establish a general reuse license or current operational availability.

The three supplied facility PNGs are native 200 × 200 px; render size is capped to avoid upscaling. They are facility reference images, not generated illustrations or current access/stock evidence.
