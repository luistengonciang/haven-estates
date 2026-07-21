-- Replace legacy Bay Area demo material with Bataan-specific general guidance.
delete from public.knowledge_documents
where metadata->>'place' in ('San Francisco, CA', 'Oakland, CA', 'Sausalito, CA', 'Bay Area')
   or title in ('Home purchase budget framework', 'Offer preparation checklist');

insert into public.knowledge_documents (title, content, category, metadata)
select * from (values
  ('Bataan property search context', 'Bataan is a province in Central Luzon. Treat listing locations as seller-provided text and confirm the exact barangay, access road, and boundaries before relying on them.', 'local-context', '{"place":"Bataan, Philippines","seed":"bataan-demo","kind":"general-guidance"}'::jsonb),
  ('Bataan land and title due diligence', 'Verify the title or tax declaration, survey plan, seller authority, right-of-way, zoning, utilities, and unpaid real-property taxes. A listing price or area is not proof of ownership or buildability.', 'due-diligence', '{"place":"Bataan, Philippines","seed":"bataan-demo","kind":"general-guidance"}'::jsonb),
  ('Coastal and resort-area property checks in Bataan', 'Assess flood exposure, drainage, slope stability, easements, environmental restrictions, water supply, wastewater arrangements, and seasonal access. Do not infer beach access or rental potential from listing text alone.', 'due-diligence', '{"place":"Bataan, Philippines","seed":"bataan-demo","kind":"general-guidance"}'::jsonb),
  ('Bataan home and land comparison framework', 'Compare asking price, lot or floor area, stated specs, exact locality, road access, title status, utilities, property condition, and recurring costs. Listing data is an initial lead, not a substitute for inspection or appraisal.', 'market', '{"place":"Bataan, Philippines","seed":"bataan-demo","kind":"general-guidance"}'::jsonb),
  ('Philippine purchase budget guidance for Bataan buyers', 'Include price, financing costs, taxes and transfer-related fees, registration, legal review, due diligence, insurance, repairs, association dues, and contingency. Confirm current allocations with qualified local professionals.', 'finance', '{"place":"Bataan, Philippines","seed":"bataan-demo","kind":"general-guidance"}'::jsonb),
  ('Bataan listing data limitations', 'The scraped Bataan dataset is useful for candidate discovery, but details may be incomplete, duplicated, outdated, unavailable, or inaccurate. Confirm availability, price, title, exact location, and condition independently.', 'data-quality', '{"place":"Bataan, Philippines","seed":"bataan-demo","kind":"data-disclaimer"}'::jsonb)
) as seed(title, content, category, metadata)
where not exists (select 1 from public.knowledge_documents existing where existing.title = seed.title);
