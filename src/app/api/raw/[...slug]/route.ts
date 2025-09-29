import { type NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const params = await context.params;
    const slug = params.slug || [];
    
    console.log('Serving static markdown for slug:', slug);
    
    // Construct the file path
    const filePath = slug.length === 0 
      ? join(process.cwd(), 'public', 'home.md')
      : join(process.cwd(), 'public', ...slug) + '.md';
    
    console.log('Looking for file:', filePath);
    
    // Read the pre-generated static file
    const content = await readFile(filePath, 'utf-8');
    
    console.log('Successfully served static markdown for:', slug.join('/'));
    
    return new NextResponse(content, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error serving static markdown:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a file not found error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return new NextResponse('Markdown file not found', { status: 404 });
    }
    
    return new NextResponse(`Error serving markdown: ${errorMessage}`, { status: 500 });
  }
}