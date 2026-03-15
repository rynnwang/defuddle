import { parseHTML } from 'linkedom';
// 1. 注意：这里是默认导入（没有花括号），且首字母大写
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

    // 2. 模拟 DOM 环境
    const { document } = parseHTML(html);

    // 3. 实例化 Defuddle 类
    // 因为 Defuddle 在构造函数中接收 (doc, options)
    // 我们需要用 new 关键字
    const instance = new Defuddle(document as any, { 
      url: url || '' 
    });

    // 4. 调用 parse() 方法获取结果
    // 根据 index.full.ts，parse() 会执行清理并转换 Markdown
    const result = instance.parse();

    return new Response(JSON.stringify({
      // result 通常包含 markdown 属性
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

// 处理跨域预检
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