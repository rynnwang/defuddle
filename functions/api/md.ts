import { parseHTML } from 'linkedom';
import Defuddle from '../../src/index';
import type { DefuddleResponse } from '../../src/types';

type PagesFunction = (context: any) => Promise<Response>;

// 深度清扫函数：移除所有非文本内容的干扰标签
function sanitizeDocument(doc: any) {
  const noisyTags = ['script', 'style', 'iframe', 'noscript', 'canvas', 'svg', 'header', 'footer'];
  noisyTags.forEach(tag => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach((el: any) => el.remove());
  });
}

async function processToResponse(html: string, url: string | undefined, format: string): Promise<Response> {
  const { document } = parseHTML(html);
  
  // --- 关键修复：在解析前先进行清扫 ---
  sanitizeDocument(document);

  const instance = new Defuddle(document as any, { 
    url: url || undefined,
    debug: false 
  });
  
  const result: DefuddleResponse = instance.parse();
  
  // 确保提取出真正的字符串
  const markdown = (result as any).markdown || (result as any).content || "";

  if (format === 'markdown' || format === 'md') {
    return new Response(markdown, {
      headers: { 
        'Content-Type': 'text/markdown; charset=utf-8',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  } else {
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
}

// 保持 GET 和 POST 的入口逻辑不变...
export const onRequestGet: PagesFunction = async (context) => {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get('url');
  const format = searchParams.get('format') || 'markdown';
  if (!targetUrl) return new Response('Missing url parameter', { status: 400 });

  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
    });
    const html = await response.text();
    return await processToResponse(html, targetUrl, format);
  } catch (error: any) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = await context.request.json() as { html?: string; url?: string; format?: string };
    const { html, url, format = 'json' } = body;
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