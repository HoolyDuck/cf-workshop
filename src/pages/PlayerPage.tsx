import { useEffect, useRef, useState } from "react";

import { useQuizSocket } from "../hooks/useQuizSocket";
import Question from "../components/Question";
import Leaderboard from "../components/Leaderboard";

type PlayerPageProps = {
	code: string;
	playerName: string;
};

function PlayerPage({ code, playerName }: PlayerPageProps) {
	const { state, send } = useQuizSocket(code, "player");
	const [selected, setSelected] = useState<number | undefined>(undefined);
	const hasJoined = useRef(false);
	const lastQuestionId = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (state.connected && !hasJoined.current) {
			hasJoined.current = true;
			send({ type: "join", name: playerName });
		}
	}, [state.connected]);

	useEffect(() => {
		if (state.question && state.question.id !== lastQuestionId.current) {
			lastQuestionId.current = state.question.id;
			setSelected(undefined);
		}
	}, [state.question]);

	function handleSelect(optionIndex: number) {
		if (selected !== undefined) {
			return;
		}
		setSelected(optionIndex);
		send({ type: "submit_answer", optionIndex });
	}

	return (
		<div className="container">
			{state.status === "lobby" && (
				<header>
					<div className="eyebrow">You're in!</div>
					<h1>Waiting for the host to start...</h1>
				</header>
			)}

			{state.status === "playing" && state.question && selected === undefined && (
				<Question question={state.question} onSelect={handleSelect} selected={selected} />
			)}

			{state.status === "playing" && state.question && selected !== undefined && (
				<header>
					<div className="eyebrow">Answer submitted</div>
					<h1>Waiting for the other players...</h1>
				</header>
			)}

			{state.status === "revealed" && state.question && state.correctOption !== undefined && (
				<>
					<Question
						question={state.question}
						selected={selected}
						correctOption={state.correctOption}
						disabled
					/>
					<h2>Leaderboard</h2>
					<Leaderboard entries={state.leaderboard ?? []} />
				</>
			)}

			{state.status === "finished" && (
				<>
					<h2>Final results</h2>
					<Leaderboard entries={state.leaderboard ?? []} />
				</>
			)}
		</div>
	);
}

export default PlayerPage;
