import { useState } from "react";

type JoinFormProps = {
	onJoin: (code: string, name: string) => void;
	onBack: () => void;
};

function JoinForm({ onJoin, onBack }: JoinFormProps) {
	const [code, setCode] = useState("");
	const [name, setName] = useState("");

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		if (code.trim().length !== 4 || !name.trim()) {
			return;
		}

		onJoin(code.trim().toUpperCase(), name.trim());
	}

	return (
		<div className="container">
			<header>
				<div className="eyebrow">Cloudflare Quiz</div>
				<h1>Join Quiz</h1>
			</header>

			<form className="form" onSubmit={handleSubmit}>
				<label>
					Room code
					<input
						value={code}
						onChange={(event) => setCode(event.target.value.toUpperCase())}
						maxLength={4}
						placeholder="8J4K"
						autoFocus
					/>
				</label>

				<label>
					Your name
					<input
						value={name}
						onChange={(event) => setName(event.target.value)}
						maxLength={24}
						placeholder="Your name"
					/>
				</label>

				<button type="submit" className="primary">
					Join
				</button>

				<button type="button" className="link" onClick={onBack}>
					Back
				</button>
			</form>
		</div>
	);
}

export default JoinForm;
