import { parseHTML } from 'linkedom';
import { Defuddle } from '../../src/defuddle';
import type { DefuddleResponse } from '../../src/types';

type PagesFunction = (context: any) => Promise<Response>;

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = await context.request.json() as { html?: string; url?: string };
    const { html, url } = body;

    if (!html || typeof html !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid HTML content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (html.length > 10 * 1024 * 1024) { // 10MB limit
      return new Response(JSON.stringify({ error: 'HTML content exceeds size limit (10MB)' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 创建 DOM 环境
    const { document } = parseHTML(html);

    // 实例化 Defuddle 并解析
    const instance = new Defuddle(document as any, { 
      url: url || undefined,
      debug: false
    });

    const result: DefuddleResponse = instance.parse();

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Defuddle processing error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Processing failed', 
      message: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};