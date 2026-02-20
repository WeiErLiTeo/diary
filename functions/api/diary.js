// 这个文件放在 GitHub 项目的 functions/api/ 目录下。

function authenticate(request, env) {
    const authHeader = request.headers.get('Authorization');
    const correctPassword = env.SITE_PASSWORD;
    if (!correctPassword) return false;
    return authHeader === correctPassword;
}

export async function onRequestGet({ request, env }) {
    if (!authenticate(request, env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
            status: 401, headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const list = await env.DIARY_KV.list({ prefix: "log_" });
        let entries = [];

        for (const key of list.keys) {
            const value = await env.DIARY_KV.get(key.name);
            if (value) entries.push(JSON.parse(value));
        }

        entries.sort((a, b) => b.timestamp - a.timestamp);

        return new Response(JSON.stringify({ success: true, entries }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestPost({ request, env }) {
    if (!authenticate(request, env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
            status: 401, headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const timestamp = Date.now();
        const id = `log_${timestamp}`;

        // 保存便签、日记和图片的Base64数据
        const record = {
            id: id,
            timestamp: timestamp,
            data: {
                memo: body.memo || "",
                diary: body.diary || "",
                image: body.image || null
            }
        };

        await env.DIARY_KV.put(id, JSON.stringify(record));

        return new Response(JSON.stringify({ success: true, id }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
}

// 🌟 【这里是新增的删除接口】 🌟
export async function onRequestDelete({ request, env }) {
    if (!authenticate(request, env)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
            status: 401, headers: { "Content-Type": "application/json" }
        });
    }

    try {
        // 从请求 URL 中获取要删除的 ID (?id=log_1234567)
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(JSON.stringify({ error: "Missing diary ID" }), { 
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // 在 KV 数据库中彻底删除这个 key
        await env.DIARY_KV.delete(id);

        return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
}