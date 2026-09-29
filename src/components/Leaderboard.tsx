import type { LeaderboardEntry } from "../types/quiz";

type LeaderboardProps = {
	entries: LeaderboardEntry[];
};

function Leaderboard({ entries }: LeaderboardProps) {
	return (
		<div className="options">
			{entries.map((entry, index) => (
				<div key={entry.id} className="option">
					<span>
						{index + 1}. {entry.name}
					</span>
					<span>{entry.score}</span>
				</div>
			))}
		</div>
	);
}

export default Leaderboard;
