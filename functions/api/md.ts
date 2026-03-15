import { parseHTML } from 'linkedom';
// 核心修复点 1：去掉花括号，首字母大写，匹配 export default Defuddle
import Defuddle from '../../src/index'; 

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const { html, url } = await context.request.json() as { html?: string, url?: string };

    if (!html) {
      return new Response(JSON.stringify({ error: 'Missing HTML content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 模拟 DOM 环境
    const { document } = parseHTML(html);

    // 核心修复点 2：使用 new 关键字实例化类
    // 传入 document 和 options 对象
    const instance = new Defuddle(document as any, { 
      url: url || '' 
    });

    // 调用 parse 方法进行转换
    const result = instance.parse();

    return new Response(JSON.stringify({
      // 根据 DefuddleResponse 的结构返回结果
      markdown: (result as any).markdown || result,
      status: 'success'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Processing failed', 
      message: error.message 
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