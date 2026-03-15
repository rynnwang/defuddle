import { parseHTML } from 'linkedom';
import Defuddle from '../../src/index';
import type { DefuddleResponse } from '../../src/types';

type PagesFunction = (context: any) => Promise<Response>;

// 深度物理清洗：确保没有任何脚本和样式进入解析环节
function hardSanitize(doc: any) {
  const garbage = ['script', 'style', 'iframe', 'noscript', 'canvas', 'svg', 'header', 'footer', 'nav', 'aside'];
  garbage.forEach(tag => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach((el: any) => el.remove());
  });
}

// 核心解析逻辑
async function getParsedResult(html: string, url: string | undefined): Promise<DefuddleResponse> {
  const { document } = parseHTML(html);
  
  // 第一步：在解析前先暴力清扫 DOM 树
  hardSanitize(document);

  const instance = new Defuddle(document as any, { 
    url: url || undefined,
    debug: false 
  });
  
  return instance.parse();
}

export const onRequestGet: PagesFunction = async (context) => {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get('url');
  // 默认为 markdown 格式
  const format = searchParams.get('format')?.toLowerCase() || 'markdown';

  if (!targetUrl) return new Response('Error: Missing url parameter', { status: 400 });

  try {
    const response = await fetch(targetUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) return new Response(`Fetch Failed: ${response.status}`, { status: response.status });

    const html = await response.text();
    const result = await getParsedResult(html, targetUrl);
    
    // 提取真正的 Markdown 字符串
    const markdown = (result as any).markdown || (result as any).content || "";

    if (format === 'markdown' || format === 'md') {
      return new Response(markdown, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    } else {
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  } catch (error: any) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = await context.request.json() as { html?: string; url?: string; format?: string };
    const { html, url, format = 'json' } = body;

    if (!html) return new Response(JSON.stringify({ success: false, error: 'No HTML provided' }), { status: 400 });

    const result = await getParsedResult(html, url);
    const markdown = (result as any).markdown || (result as any).content || "";

    if (format === 'markdown' || format === 'md') {
      return new Response(markdown, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    } else {
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
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