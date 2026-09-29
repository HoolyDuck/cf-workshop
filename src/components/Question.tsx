import type { PublicQuestion } from "../types/quiz";

type QuestionProps = {
	question: PublicQuestion;
	onSelect?: (optionIndex: number) => void;
	selected?: number;
	correctOption?: number;
	disabled?: boolean;
};

function Question({ question, onSelect, selected, correctOption, disabled }: QuestionProps) {
	return (
		<div>
			<div className="eyebrow">
				Question {question.position + 1} / {question.total}
			</div>
			<h2>{question.text}</h2>

			<div className="options">
				{question.options.map((text, index) => {
					const isCorrect = correctOption !== undefined && index === correctOption;
					const isWrongSelected =
						correctOption !== undefined && index === selected && index !== correctOption;

					return (
						<button
							key={index}
							className={
								"option" +
								(isCorrect ? " correct" : "") +
								(isWrongSelected ? " wrong" : "") +
								(selected === index && correctOption === undefined ? " selected" : "")
							}
							disabled={disabled || !onSelect}
							onClick={() => onSelect?.(index)}
						>
							<span>{text}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

export default Question;
