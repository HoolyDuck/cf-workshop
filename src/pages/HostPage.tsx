import { useQuizSocket } from "../hooks/useQuizSocket";
import PlayerList from "../components/PlayerList";
import Question from "../components/Question";
import Leaderboard from "../components/Leaderboard";

type HostPageProps = {
	code: string;
};

function HostPage({ code }: HostPageProps) {
	const { state, send } = useQuizSocket(code, "host");

	return (
		<div className="container">
			<header>
				<div className="eyebrow">Room code</div>
				<h1>{code}</h1>
			</header>

			{state.status === "lobby" && (
				<>
					<PlayerList players={state.players} />
					<button className="primary" onClick={() => send({ type: "start_quiz" })}>
						Start Quiz
					</button>
				</>
			)}

			{state.status === "playing" && state.question && (
				<>
					<Question question={state.question} />
					<p>
						{state.answered ?? 0} / {state.total ?? state.players.length} answered
					</p>
					<div className="progress">
						<div
							className="progress-bar"
							style={{
								width: `${((state.answered ?? 0) / Math.max(1, state.total ?? state.players.length)) * 100}%`,
							}}
						/>
					</div>
					<button className="primary" onClick={() => send({ type: "show_answer" })}>
						Show Answer
					</button>
				</>
			)}

			{state.status === "revealed" && state.question && state.correctOption !== undefined && (
				<>
					<p>Correct answer: {state.question.options[state.correctOption]}</p>
					<h2>Leaderboard</h2>
					<Leaderboard entries={state.leaderboard ?? []} />
					<button className="primary" onClick={() => send({ type: "next_question" })}>
						Next Question
					</button>
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

export default HostPage;
