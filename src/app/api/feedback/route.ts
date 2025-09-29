import { NextResponse } from 'next/server';

type DocsFeedback = {
  url: string;
  opinion: 'good' | 'bad';
  message: string;
  email?: string;
};

type AIFeedback = {
  type: 'ai';
  question: string;
  answer: string;
  rating: 'positive' | 'negative';
  comment?: string;
  email?: string;
};

type Feedback = DocsFeedback | AIFeedback;

/**
 * Prevent a user‑supplied message from prematurely closing the Slack
 * triple‑backtick fence by inserting a zero‑width space after the first
 * backtick in every "```" sequence.
 */
function escapeTripleBackticks(input: string): string {
  return input.replace(/```/g, '`\u200b``');
}

export async function POST(req: Request) {
  let body: Feedback;
  try {
    body = (await req.json()) as Feedback;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid feedback format. Please contact Support.' },
      { status: 400 },
    );
  }

  // Determine webhook based on feedback type
  const isAIFeedback = 'type' in body && body.type === 'ai';
  const webhook = isAIFeedback 
    ? process.env.SLACK_AI_FEEDBACK_WEBHOOK 
    : process.env.SLACK_FEEDBACK_WEBHOOK;
  
  if (!webhook) {
    return NextResponse.json(
      { success: false, error: 'Currently unable to send feedback. Please contact Support.' },
      { status: 500 },
    );
  }

  // Determine the base URL from the request headers
  const host = req.headers.get('host') || 'superwall.com';
  const referer = req.headers.get('referer');
  let baseUrl: string;
  
  if (host.includes('localhost')) {
    baseUrl = `http://localhost:${host.split(':')[1] || '3000'}/docs`;
  } else if (host.includes('workers.dev')) {
    // Staging environment
    baseUrl = `https://${host}/docs`;
  } else if (referer && referer.includes('workers.dev')) {
    // Fallback: check referer for staging
    const refererUrl = new URL(referer);
    baseUrl = `${refererUrl.origin}/docs`;
  } else {
    // Production
    baseUrl = 'https://superwall.com/docs';
  }

  // Format message based on feedback type
  let slackMessage: string;
  
  if (isAIFeedback) {
    const aiFeedback = body as AIFeedback;
    slackMessage = [
      '*🤖 Docs AI Feedback*',
      `*Question*: \n\`\`\`${escapeTripleBackticks(aiFeedback.question)}\`\`\``,
      `*Answer*: \n\`\`\`${escapeTripleBackticks(aiFeedback.answer.substring(0, 500))}${aiFeedback.answer.length > 500 ? '...' : ''}\`\`\``,
      `*Opinion*: ${aiFeedback.rating === 'positive' ? '👍' : '👎'}`,
      `*Message*: \n\`\`\`${escapeTripleBackticks(aiFeedback.comment || '_none_')}\`\`\``,
      ...(aiFeedback.email ? [`*User*: ${aiFeedback.email}`] : []),
    ].join('\n');
  } else {
    const docsFeedback = body as DocsFeedback;
    slackMessage = [
      '*📄 Docs Feedback*',
      `*URL*: ${baseUrl}${docsFeedback.url}`,
      `*Opinion*: ${docsFeedback.opinion === 'good' ? '👍' : '👎'}`,
      `*Message*: \n\`\`\`${escapeTripleBackticks(docsFeedback.message || '_none_')}\`\`\``,
      ...(docsFeedback.email ? [`*User*: ${docsFeedback.email}`] : []),
    ].join('\n');
  }

  const slackRes = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: slackMessage,
    }),
  });

  if (!slackRes.ok) {
    return NextResponse.json(
      { success: false, error: 'Failed to send feedback. Please contact Support.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}