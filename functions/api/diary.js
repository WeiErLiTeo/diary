// 这个文件需要放在你项目的 functions/api/ 目录下。
// 这样 Cloudflare Pages 会自动将其映射为 /api/diary 接口。
//
// 部署准备：
// 1. 在 Cloudflare Pages 设置中绑定一个 KV 命名空间，变量名必须为：DIARY_KV
// 2. 在 Cloudflare Pages 设置中添加一个环境变量，变量名必须为：SITE_PASSWORD，填入你设置的密码

// 验证密码的辅助函数
function authenticate(request, env) {
    const authHeader = request.headers.get('Authorization');
    const correctPassword = env.SITE_PASSWORD;
    
    if (!correctPassword) {
        // 如果环境变量没配置，默认拒绝，防止意外公开
        return false;
    }
    return authHeader === correctPassword;
}

// 处理 GET 请求：获取日记列表
export async function onRequestGet({ request, env }) {
    if (!authenticate(request, env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        // 获取 KV 中前缀为 log_ 的所有键
        const list = await env.DIARY_KV.list({ prefix: "log_" });
        let entries = [];

        // 遍历获取对应的值
        for (const key of list.keys) {
            const value = await env.DIARY_KV.get(key.name);
            if (value) {
                entries.push(JSON.parse(value));
            }
        }

        // 按时间倒序排列（最新的在最上面）
        entries.sort((a, b) => b.timestamp - a.timestamp);

        return new Response(JSON.stringify({ success: true, entries }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

// 处理 POST 请求：新增日记
export async function onRequestPost({ request, env }) {
    if (!authenticate(request, env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const timestamp = Date.now();
        const id = `log_${timestamp}`;

        // 构造存入数据库的对象
        const record = {
            id: id,
            timestamp: timestamp,
            data: {
                vocab: body.vocab || "",
                grammar: body.grammar || "",
                diary: body.diary || ""
            }
        };

        // 以纯文本 JSON 格式存入 KV
        await env.DIARY_KV.put(id, JSON.stringify(record));

        return new Response(JSON.stringify({ success: true, id }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
