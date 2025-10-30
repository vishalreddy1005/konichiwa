import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongoose';
import Answer from '@/models/Answer';
import { Types } from 'mongoose';

export async function GET(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  await connectToDB();

  // `params` is a possibly async proxy in Next.js dynamic routes — await it before use
    const resolvedParams = await params as unknown;
    if (typeof resolvedParams !== 'object' || resolvedParams === null || !('id' in resolvedParams)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }
    const { id } = resolvedParams as { id: string };
  let qId: Types.ObjectId;
  try {
    qId = new Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const ans = await Answer.findOne({ qId }).lean();
  if (!ans) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ correctOptionIndex: ans.correctOptionIndex, reasoning: ans.reasoning });
}
