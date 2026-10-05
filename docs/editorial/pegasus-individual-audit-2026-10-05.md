# Independent Pegasus portrait audit

Date: 2026-10-05

Authority: The owner requested all standalone website Pegasus portraits to be generated independently from the approved original family artwork, with each high-resolution render supplied separately.

Scope: Eleven existing characters only: Luna Tide, Night Nectar, Stillearth, Clearsky, Monsoon, Drift, Cloudlift, Evenfall, Glowstate, Golden Tide and Scarlet Sky. Each is a new AI-rendered interpretation using the approved family image as reference, rather than a crop or upscale of that image. The official black/gold brand logo and group hero remain unchanged.

Implementation: Replace SVG viewBox crop windows in PegasusPortrait with individual transparent WebP assets and object-contain sizing. Remove the portrait clipping class so wings and tails retain their full composition. Original generated PNGs are 1254 by 1254 pixels with alpha; website derivatives are 640 by 640 pixels for efficient loading.

Validation: Inspect each generated character, confirm the full set of eleven filenames and alpha-enabled derivatives, verify the production build and inspect the deployed page for independent image sources and successful image loading.

Editorial: No copy, prices, product facts, health claims, contact details, authentication, or data processing changes. Character names remain those already approved. No claim of pixel-identical reproduction, vector artwork, or 4K resolution.
