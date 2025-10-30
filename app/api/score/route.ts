import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongoose';
import Answer from '@/models/Answer';
import { Types } from 'mongoose';

export async function POST(req: Request) {
  await connectToDB();

  const body = await req.json();
  const submitted: Array<{ qId: string; selectedIndex: number }> = body.answers || [];

  if (!Array.isArray(submitted) || submitted.length === 0) {
    return NextResponse.json({ percentage: 0 });
  }

  const ids = submitted.map((s) => {
    try {
      return new Types.ObjectId(s.qId);
    } catch {
      return null;
    }
  }).filter(Boolean) as Types.ObjectId[];

  // Query by qId field
  const answers = await Answer.find({ qId: { $in: ids } }).lean();
  const answerMap = new Map<string, number>();
  for (const a of answers) {
    // a.qId may be an ObjectId — coerce to string key
    const key = a.qId ? String(a.qId) : '';
    if (key) answerMap.set(key, a.correctOptionIndex as number);
  }

  let correct = 0;
  for (const s of submitted) {
    const correctIndex = answerMap.get(s.qId);
    if (typeof correctIndex === 'number' && correctIndex === s.selectedIndex) correct++;
  }

  const percentage = Math.round((correct / submitted.length) * 100);

  return NextResponse.json({ percentage });
}
