-- Records which version of the event text a score was computed against.
--
-- Without it, `content_hash` changing (a corrected title, an edited
-- description) leaves the cached score in place forever, because nothing
-- compares the two. profile_hash / scoring_version / scoring_model cover the
-- scorer changing; this covers the event changing.
alter table events add column scored_content_hash text;

update events set scored_content_hash = content_hash where relevance_score is not null;
