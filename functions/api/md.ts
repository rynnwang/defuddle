import { parseHTML } from 'linkedom';
// 注意：路径根据你的目录结构可能需要微调，通常 fork 后是这个路径
import { defuddle } from '../../src/index'; 

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const request = context.request;
    
    // 解析请求体
    const { html, url } = await request.json() as { html?: string, url?: string };

    if (!html) {
      return new Response(JSON.stringify({ error: 'Missing HTML content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. 使用 linkedom 在 Edge Runtime 模拟 DOM 环境
    // linkedom 性能极高且内存占用低，非常适合 Workers
    const { document } = parseHTML(html);

    // 2. 调用 defuddle 核心逻辑
    // 如果 defuddle 需要 URL 来处理相对路径，可以传入第二个参数（取决于版本实现）
    const markdown = defuddle(document);

    // 3. 返回结果
    return new Response(JSON.stringify({
      markdown,
      url: url || null,
      byteCount: new TextEncoder().encode(markdown).length,
      status: 'success'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // 允许跨域，方便你的 UI demo 调用
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to process HTML', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// 增加对 OPTIONS 请求的支持，处理跨域预检
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