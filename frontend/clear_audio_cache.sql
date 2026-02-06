-- Clear audio cache to force regeneration with new word boundaries
UPDATE "Story" SET "audioUrl" = NULL, "audioAlignment" = NULL;
