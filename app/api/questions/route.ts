import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongoose';
import Question from '@/models/Question';

export async function GET() {
  await connectToDB();

  // pick 5 random questions
  const questions = await Question.aggregate([{ $sample: { size: 5 } }, { $project: { text: 1, options: 1 } }]);

  return NextResponse.json({ questions });
}
