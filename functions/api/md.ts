import { parseHTML } from 'linkedom';
import { clean } from '../../src/index'; // 指向 defuddle 的核心逻辑

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const { html } = await context.request.json();
    
    if (!html) {
      return new Response('Missing HTML content', { status: 400 });
    }

    // 在 Edge 环境中模拟 DOM
    const { document } = parseHTML(html);
    
    // 调用 defuddle 进行清理
    const cleanedContent = clean(document);

    return new Response(JSON.stringify({
      markdown: cleanedContent,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
};