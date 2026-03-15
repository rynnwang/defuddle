import { parseHTML } from 'linkedom';
import Defuddle from '../../src/index';
import type { DefuddleResponse } from '../../src/types';

type PagesFunction = (context: any) => Promise<Response>;

// 核心解析函数
async function processToResponse(html: string, url: string | undefined, format: string): Promise<Response> {
  const { document } = parseHTML(html);
  const instance = new Defuddle(document as any, { url: url || undefined });
  const result: DefuddleResponse = instance.parse();
  
  const markdown = (result as any).markdown || (result as any).content || "";

  // 根据参数决定返回格式
  if (format === 'markdown' || format === 'md') {
    return new Response(markdown, {
      headers: { 
        'Content-Type': 'text/markdown; charset=utf-8',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  } else {
    // 默认返回 JSON，包含完整数据
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
}

export const onRequestGet: PagesFunction = async (context) => {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get('url');
  const format = searchParams.get('format') || 'markdown'; // GET 默认返回纯文本

  if (!targetUrl) return new Response('Missing url parameter', { status: 400 });

  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
    });

    if (!response.ok) return new Response(`Fetch failed: ${response.status}`, { status: response.status });

    const html = await response.text();
    return await processToResponse(html, targetUrl, format);
  } catch (error: any) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = await context.request.json() as { html?: string; url?: string; format?: string };
    const { html, url, format = 'json' } = body; // POST 默认返回 JSON

    if (!html) return new Response(JSON.stringify({ error: 'Missing HTML' }), { status: 400 });

    return await processToResponse(html, url, format);
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
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