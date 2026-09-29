import type { Quiz, QuizQuestion } from "../types/quiz";

type QuizRow = { id: number; title: string };
type QuestionRow = {
	id: number;
	position: number;
	text: string;
	correct_option: number;
};
type OptionRow = {
	id: number;
	question_id: number;
	position: number;
	text: string;
};

export async function getQuiz(
	db: D1Database,
	quizId: number,
): Promise<Quiz | null> {
	const quizRow = await db
		.prepare("SELECT id, title FROM quizzes WHERE id = ?")
		.bind(quizId)
		.first<QuizRow>();

	if (!quizRow) {
		return null;
	}

	const { results: questionRows } = await db
		.prepare(
			"SELECT id, position, text, correct_option FROM questions WHERE quiz_id = ? ORDER BY position",
		)
		.bind(quizId)
		.all<QuestionRow>();

	const { results: optionRows } = await db
		.prepare(
			`SELECT question_options.id, question_options.question_id, question_options.position, question_options.text
			 FROM question_options
			 JOIN questions ON questions.id = question_options.question_id
			 WHERE questions.quiz_id = ?
			 ORDER BY question_options.question_id, question_options.position`,
		)
		.bind(quizId)
		.all<OptionRow>();

	const questions: QuizQuestion[] = questionRows.map((question) => ({
		id: question.id,
		position: question.position,
		text: question.text,
		correctOption: question.correct_option,
		options: optionRows
			.filter((option) => option.question_id === question.id)
			.map((option) => ({
				id: option.id,
				position: option.position,
				text: option.text,
			})),
	}));

	return { id: quizRow.id, title: quizRow.title, questions };
}
