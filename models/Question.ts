import mongoose, { Schema, model, models } from 'mongoose';

export interface IQuestion {
  text: string;
  options: [string, string, string, string];
}

const QuestionSchema = new Schema<IQuestion>({
  text: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function (v: string[]) {
        return Array.isArray(v) && v.length === 4 && v.every((s) => typeof s === 'string' && s.length > 0);
      },
      message: 'Options must be an array of exactly 4 non-empty strings',
    },
  },
}, { collection: "questions" }
);

const Question = (models.Question as mongoose.Model<IQuestion>) || model<IQuestion>('Question', QuestionSchema);

export default Question;
