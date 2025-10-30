import mongoose, { Schema, model, models, Types } from 'mongoose';
import { IQuestion } from './Question';

export interface IAnswer {
  qId: Types.ObjectId | IQuestion;
  correctOptionIndex: number;
  reasoning: string;
}

const AnswerSchema = new Schema<IAnswer>({
  qId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, unique: true },
  correctOptionIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  reasoning: {
    type: String,
    required: true,
  },
}, { collection: "answers" }
);

const Answer = (models.Answer as mongoose.Model<IAnswer>) || model<IAnswer>('Answer', AnswerSchema);

export default Answer;
