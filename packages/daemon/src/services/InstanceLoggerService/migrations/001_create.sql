--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE "logs" (
	"id"	TEXT UNIQUE,
	"created"	TEXT NOT NULL,
	"updated"	TEXT NOT NULL,
	"message"	TEXT NOT NULL,
	"stream"	TEXT NOT NULL,
	PRIMARY KEY("id")
);

CREATE INDEX "updated" ON "logs" (
	"updated"	DESC
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP INDEX "updated";
DROP TABLE "logs";