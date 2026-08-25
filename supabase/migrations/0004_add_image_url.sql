-- AllEvents' JSON-LD carries a banner image per event and we were discarding
-- it. A grid of text-only cards gives the eye nothing to land on.
alter table events add column image_url text;
