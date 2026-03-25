-- Seed data: 10 real NZ community events
-- Dates span the last few months (late 2025 – early 2026)

insert into events (code, title, description, status, event_date, languages, organiser_name) values

('KAI492', 'Te Wiki o te Reo Māori — Opening Ceremony',
 'Kicking off Te Wiki o te Reo Māori with karakia, waiata, and a keynote address by Dr Pita Sharples on the revitalisation journey since the 1980s. Captions available in te reo Māori and English.',
 'ended', '2025-09-15 09:00:00+12', ARRAY['en-NZ', 'mi-NZ'], 'Hemi Walker'),

('TPN831', 'Wellington Climate Action Summit 2025',
 'Representatives from iwi, local government, and environmental groups gather to discuss He Pou a Rangi — the Climate Change Commission''s latest recommendations and binding emissions targets for Aotearoa.',
 'ended', '2025-10-03 08:30:00+13', ARRAY['en-NZ', 'mi-NZ', 'sm-WS', 'zh-Hans'], 'Aroha Ngāta'),

('AUK217', 'Pasifika Futures: Education & Workforce Forum',
 'A full-day forum connecting Pacific community leaders, educators, and employers to shape pathways for rangatahi Pasifika into tech, health, and the trades. Hosted by the Pacific Business Trust.',
 'ended', '2025-10-18 09:00:00+13', ARRAY['en-NZ', 'sm-WS', 'to-TO'], 'Sione Tuilagi'),

('CHC504', 'Canterbury Earthquake Memorial Service — 14th Anniversary',
 'An annual service of remembrance for the 185 lives lost on 22 February 2011. Held at the Transitional Cathedral with reflections from Mayor Phil Mauger and survivor stories from the Quake Outcasts group.',
 'ended', '2025-11-22 12:30:00+13', ARRAY['en-NZ', 'mi-NZ', 'zh-Hans'], 'Rebecca Thorn'),

('DUN093', 'Otago Māori Language Hui',
 'Whānau, kura kaupapa kaiako, and iwi reps from Te Waipounamu come together to plan the next decade of reo revitalisation in the deep south. Workshop sessions on immersive learning and digital tools.',
 'ended', '2025-11-29 10:00:00+13', ARRAY['en-NZ', 'mi-NZ'], 'Ngāpera Rātū'),

('HAM762', 'Waikato River Accord: Community Consultation',
 'Public consultation on the proposed Waikato River Restoration Framework — a joint initiative between Waikato-Tainui, Waikato Regional Council, and DOC. All submissions will be presented to the Crown.',
 'ended', '2025-12-06 10:00:00+13', ARRAY['en-NZ', 'mi-NZ'], 'Tama Parata'),

('NPE318', 'Hawke''s Bay Cyclone Recovery — 2 Year Update',
 'Community town hall marking two years since Cyclone Gabrielle. Iwi leaders, the Regional Recovery Agency, and whānau share progress on housing, infrastructure, and whenua restoration across the region.',
 'ended', '2026-01-14 14:00:00+13', ARRAY['en-NZ', 'mi-NZ', 'sm-WS'], 'Mere Tūhoe'),

('ROT445', 'Rotorua Geothermal & Tourism Investment Conference',
 'Annual investor and operator summit hosted by Destination Rotorua. Sessions cover geothermal energy licensing, Māori tourism ventures, and post-pandemic visitor growth strategies for the Rotorua Lakes District.',
 'ended', '2026-02-05 08:00:00+13', ARRAY['en-NZ', 'zh-Hans', 'mi-NZ'], 'Craig Macfarlane'),

('PMR680', 'Palmerston North Disability Rights Forum',
 'Bringing together disabled people, whānau, and service providers to review progress on the NZ Disability Strategy 2023–2026. Keynote from the Office for Disability Issues; panel on accessible employment.',
 'ended', '2026-02-27 09:30:00+13', ARRAY['en-NZ', 'mi-NZ'], 'Lisa Edmonds'),

('NSN156', 'Nelson Tasman Kaitiakitanga Symposium',
 'Iwi, farmers, and conservation volunteers convene to celebrate the Waimea Inlet restoration project and discuss emerging threats to the top-of-the-south''s freshwater ecosystems. Includes evening celebration with cultural performances.',
 'upcoming', '2026-04-11 09:00:00+12', ARRAY['en-NZ', 'mi-NZ'], 'Rangi Hāpai');
