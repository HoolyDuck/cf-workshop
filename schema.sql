-- Re-runnable: drops and re-seeds (children first). Use with --local only.
DROP TABLE IF EXISTS question_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS quizzes;

CREATE TABLE quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL
);

CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  correct_option INTEGER NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

CREATE TABLE question_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

INSERT INTO quizzes (id, title) VALUES (1, 'Cloudflare Quiz');

INSERT INTO questions (id, quiz_id, position, text, correct_option) VALUES
  (1, 1, 0, 'Why doesn''t deploying a Cloudflare Worker require you to pick a region?', 0),
  (2, 1, 1, 'What do you give up by running code in Workers'' short-lived isolate model instead of a traditional long-lived server process?', 1),
  (3, 1, 2, 'What does env.QUIZ_ROOM.getByName("A7K2") actually give you?', 2),
  (4, 1, 3, 'What''s the real difference between a normal server holding a WebSocket open and a Durable Object doing it with Hibernation?', 1),
  (5, 1, 4, 'The deck splits state into "persistent data" and "live coordination." Which of these belongs in the Durable Object, not D1?', 3);

INSERT INTO question_options (question_id, position, text) VALUES
  (1, 0, 'Anycast automatically routes each request to the nearest of Cloudflare''s ~348 locations'), (1, 1, 'Workers run in a single fixed datacenter'), (1, 2, 'You must still choose a region manually in wrangler.jsonc'), (1, 3, 'Cloudflare picks a region randomly for each deploy'),
  (2, 0, 'The ability to accept HTTP requests'), (2, 1, 'A filesystem, a long-lived process, and reliable global in-memory state'), (2, 2, 'TLS/HTTPS termination'), (2, 3, 'Access to bindings like D1 or Durable Objects'),
  (3, 0, 'A brand-new Durable Object instance on every call'), (3, 1, 'A row from the D1 quizzes table'), (3, 2, 'A stub for the one specific Durable Object identified by "A7K2" — the same instance every time'), (3, 3, 'A raw WebSocket connection'),
  (4, 0, 'A normal server can''t hold WebSocket connections open at all'), (4, 1, 'The normal server pays for compute the whole time it''s idle; the hibernating Durable Object''s compute only wakes up when there''s work to do'), (4, 2, 'Hibernation closes and reopens the socket between every message'), (4, 3, 'Hibernation replaces WebSockets with polling'),
  (5, 0, 'The full text and options for every question in the quiz'), (5, 1, 'A historical log of finished quizzes for analytics'), (5, 2, 'The list of every room code ever created'), (5, 3, 'Which question is currently open and who has answered it so far');
