import { parseHTML } from 'linkedom';
import Defuddle from '../../src/index';
import type { DefuddleResponse } from '../../src/types';

type PagesFunction = (context: any) => Promise<Response>;

// 核心处理函数，复用解析逻辑
async function processHtml(html: string, url?: string): Promise<DefuddleResponse> {
  const { document } = parseHTML(html);
  const instance = new Defuddle(document as any, { 
    url: url || undefined,
    debug: false
  });
  return instance.parse();
}

// 处理 GET 请求：通过 URL 参数抓取
export const onRequestGet: PagesFunction = async (context) => {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing "url" parameter' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8'
      }
    });

    if (response.status === 401 || response.status === 403) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AUTH_BLOCKED', 
        status: response.status,
        message: '该网站启用了反爬机制，请手动复制 HTML 源码进行转换。' 
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);

    const html = await response.text();
    const result = await processHtml(html, targetUrl);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: 'Fetch failed', message: error.message }), { status: 500 });
  }
};

// 保持并优化你之前的 POST 逻辑
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

    if (html.length > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'HTML content exceeds size limit (10MB)' }), { status: 413 });
    }

    const result = await processHtml(html, url);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: 'Processing failed', message: error.message }), { status: 500 });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};