import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/agent/llm';

export const dynamic = 'force-dynamic';

interface ChatBody {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

/** POST /api/chat — conversational Axway assistant. */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatBody;
  if (!body?.message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  const response = await chat(body.message, body.history ?? []);
  return NextResponse.json(response);
}
