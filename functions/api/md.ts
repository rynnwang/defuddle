import { parseHTML } from 'linkedom';
import Defuddle from '../../src/index';
import type { DefuddleResponse } from '../../src/types';

type PagesFunction = (context: any) => Promise<Response>;

/**
 * 极致清洗逻辑：剥离所有干扰，只留纯净文本容器
 */
function extremeSanitize(doc: any) {
  // 1. 物理删除绝对干扰项
  const blackList = ['script', 'style', 'iframe', 'noscript', 'canvas', 'svg', 'header', 'footer', 'nav', 'aside'];
  blackList.forEach(tag => doc.querySelectorAll(tag).forEach((el: any) => el.remove()));

  // 2. 剥离所有元素的属性（重点：删掉 style, class, data-*）
  // 当标签没有任何属性时，转换引擎会更容易将其转为纯 Markdown 而不是保留 HTML
  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el: any) => {
    while (el.attributes.length > 0) {
      el.removeAttribute(el.attributes[0].name);
    }
  });
}

/**
 * 统一解析逻辑
 */
async function processToResponse(html: string, url: string | undefined, format: string): Promise<Response> {
  const { document } = parseHTML(html);
  
  // 执行深度清洗
  extremeSanitize(document);

  const instance = new Defuddle(document as any, { 
    url: url || undefined,
    debug: false 
  });
  
  const result: DefuddleResponse = instance.parse();
  
  // 提取 Markdown 字符串
  const markdown = (result as any).markdown || (result as any).content || String(result);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (format === 'markdown' || format === 'md') {
    return new Response(markdown, {
      headers: { ...corsHeaders, 'Content-Type': 'text/markdown; charset=utf-8' }
    });
  } else {
    // JSON 格式返回完整对象
    return new Response(JSON.stringify({ success: true, data: { ...result, markdown } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export const onRequestGet: PagesFunction = async (context) => {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get('url');
  const format = searchParams.get('format')?.toLowerCase() || 'markdown';

  if (!targetUrl) return new Response('Missing url parameter', { status: 400 });

  try {
    const response = await fetch(targetUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' 
      }
    });

    if (!response.ok) return new Response(`Fetch Error: ${response.status}`, { status: response.status });

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