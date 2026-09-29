import { env } from "cloudflare:test";

// Mirrors schema.sql — kept inline since this runs inside the Workers test
// runtime, not Node, so it can't just read the file off disk.
await env.DB.exec(
	"CREATE TABLE quizzes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL)",
);
await env.DB.exec(
	"CREATE TABLE questions (id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id INTEGER NOT NULL, position INTEGER NOT NULL, text TEXT NOT NULL, correct_option INTEGER NOT NULL, FOREIGN KEY (quiz_id) REFERENCES quizzes(id))",
);
await env.DB.exec(
	"CREATE TABLE question_options (id INTEGER PRIMARY KEY AUTOINCREMENT, question_id INTEGER NOT NULL, position INTEGER NOT NULL, text TEXT NOT NULL, FOREIGN KEY (question_id) REFERENCES questions(id))",
);

await env.DB.exec("INSERT INTO quizzes (id, title) VALUES (1, 'Cloudflare Quiz')");

await env.DB.batch([
	env.DB.prepare(
		"INSERT INTO questions (id, quiz_id, position, text, correct_option) VALUES (?, 1, ?, ?, ?)",
	).bind(1, 0, "Which Cloudflare product provides serverless SQL?", 1),
	env.DB.prepare(
		"INSERT INTO questions (id, quiz_id, position, text, correct_option) VALUES (?, 1, ?, ?, ?)",
	).bind(
		2,
		1,
		"Which Cloudflare product is S3-compatible object storage with no egress fees?",
		2,
	),
	env.DB.prepare(
		"INSERT INTO questions (id, quiz_id, position, text, correct_option) VALUES (?, 1, ?, ?, ?)",
	).bind(
		3,
		2,
		"What do you call a Worker that holds state and can keep WebSocket connections open?",
		2,
	),
	env.DB.prepare(
		"INSERT INTO questions (id, quiz_id, position, text, correct_option) VALUES (?, 1, ?, ?, ?)",
	).bind(4, 3, "Which Cloudflare product is a global low-latency key-value store?", 0),
	env.DB.prepare(
		"INSERT INTO questions (id, quiz_id, position, text, correct_option) VALUES (?, 1, ?, ?, ?)",
	).bind(
		5,
		4,
		"Which Cloudflare product protects forms from bots without traditional CAPTCHAs?",
		1,
	),
]);

const options: [number, number, string][] = [
	[1, 0, "Workers"],
	[1, 1, "D1"],
	[1, 2, "R2"],
	[1, 3, "KV"],
	[2, 0, "Workers"],
	[2, 1, "D1"],
	[2, 2, "R2"],
	[2, 3, "KV"],
	[3, 0, "Queue"],
	[3, 1, "KV Namespace"],
	[3, 2, "Durable Object"],
	[3, 3, "Worker"],
	[4, 0, "KV"],
	[4, 1, "R2"],
	[4, 2, "D1"],
	[4, 3, "Durable Objects"],
	[5, 0, "WAF"],
	[5, 1, "Turnstile"],
	[5, 2, "Access"],
	[5, 3, "Magic Transit"],
];

await env.DB.batch(
	options.map(([questionId, position, text]) =>
		env.DB.prepare(
			"INSERT INTO question_options (question_id, position, text) VALUES (?, ?, ?)",
		).bind(questionId, position, text),
	),
);
