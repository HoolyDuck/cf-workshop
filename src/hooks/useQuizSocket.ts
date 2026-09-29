import { useEffect, useRef, useState } from "react";

import type {
	ClientMessage,
	LeaderboardEntry,
	Player,
	PublicQuestion,
	RoomStatus,
	ServerMessage,
} from "../types/quiz";

export type QuizSocketState = {
	connected: boolean;
	status: RoomStatus;
	players: Player[];
	question?: PublicQuestion;
	answered?: number;
	total?: number;
	correctOption?: number;
	leaderboard?: LeaderboardEntry[];
	error?: string;
};

const initialState: QuizSocketState = {
	connected: false,
	status: "lobby",
	players: [],
};

function reduce(state: QuizSocketState, message: ServerMessage): QuizSocketState {
	switch (message.type) {
		case "room_state":
			return { ...state, status: message.status, players: message.players, question: message.question };
		case "player_joined":
			// room_state always follows right after this — it's the source of truth.
			return state;
		case "quiz_started":
			return state;
		case "question_started":
			return {
				...state,
				status: "playing",
				question: message.question,
				answered: undefined,
				total: undefined,
				correctOption: undefined,
				leaderboard: undefined,
			};
		case "answer_progress":
			return { ...state, answered: message.answered, total: message.total };
		case "question_finished":
			return {
				...state,
				status: "revealed",
				correctOption: message.correctOption,
				leaderboard: message.leaderboard,
			};
		case "quiz_finished":
			return { ...state, status: "finished", leaderboard: message.leaderboard };
		case "error":
			return { ...state, error: message.message };
	}
}

export function useQuizSocket(code: string, role: "host" | "player") {
	const [state, setState] = useState<QuizSocketState>(initialState);
	const socketRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const url = `${protocol}//${window.location.host}/api/rooms/${code}/ws${role === "host" ? "?role=host" : ""}`;

		const socket = new WebSocket(url);
		socketRef.current = socket;

		socket.addEventListener("open", () => {
			setState((prev) => ({ ...prev, connected: true }));
		});

		socket.addEventListener("message", (event) => {
			const message = JSON.parse(event.data as string) as ServerMessage;
			setState((prev) => reduce(prev, message));
		});

		socket.addEventListener("close", () => {
			setState((prev) => ({ ...prev, connected: false }));
		});

		return () => socket.close();
	}, [code, role]);

	function send(message: ClientMessage): void {
		socketRef.current?.send(JSON.stringify(message));
	}

	return { state, send };
}
