// Mirrors worker/types/messages.ts — duplicated rather than shared, since the
// Worker side pulls in `cloudflare:workers` types that don't belong in a
// browser bundle. Keep the two in sync by hand; they're small.

export type RoomStatus = "lobby" | "playing" | "revealed" | "finished";

export type Player = {
	id: string;
	name: string;
	score: number;
	connected: boolean;
};

export type LeaderboardEntry = {
	id: string;
	name: string;
	score: number;
};

export type PublicQuestion = {
	id: number;
	position: number;
	total: number;
	text: string;
	options: string[];
};

export type ClientMessage =
	| { type: "join"; name: string }
	| { type: "start_quiz" }
	| { type: "submit_answer"; optionIndex: number }
	| { type: "show_answer" }
	| { type: "next_question" };

export type ServerMessage =
	| {
			type: "room_state";
			code: string;
			status: RoomStatus;
			players: Player[];
			question?: PublicQuestion;
	  }
	| { type: "player_joined"; player: Player }
	| { type: "quiz_started" }
	| { type: "question_started"; question: PublicQuestion }
	| { type: "answer_progress"; answered: number; total: number }
	| {
			type: "question_finished";
			correctOption: number;
			leaderboard: LeaderboardEntry[];
	  }
	| { type: "quiz_finished"; leaderboard: LeaderboardEntry[] }
	| { type: "error"; message: string };
