import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const webhookUrl = process.env.SLACK_404_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('DOCS_404_SLACK_WEBHOOK_URL not configured');
      return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 500 });
    }

    const { url, userAgent, referrer, email } = await request.json();
    
    // Filter out resource requests (js, css, images, etc.)
    const isResourceRequest = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|mp4|webm|ogg)$/i.test(url);
    
    if (isResourceRequest) {
      return NextResponse.json({ success: true, message: 'Resource request ignored' });
    }
    if (url.includes('localhost')) {
      return NextResponse.json({ success: true, message: 'Localhost request ignored' });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [
          '*📄 Docs 404 Report*',
          `*URL*: ${url}`,
          `*Referrer*: ${referrer}`,
          ...(email ? [`*User*: ${email}`] : []),
        ].join('\n'),
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reporting 404 to Slack:', error);
    return NextResponse.json({ success: false, error: 'Failed to report 404' }, { status: 500 });
  }
}