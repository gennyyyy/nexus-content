const fs = require('fs');

let api = fs.readFileSync('src/lib/api.ts', 'utf8');

api = api.replace(/export const API_BASE = "http:\/\/127\.0\.0\.1:8000\/api";/, 
`export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

async function handleResponse(res: Response, defaultMessage: string) {
    if (!res.ok) {
        let errorMessage = defaultMessage;
        try {
            const errData = await res.json();
            errorMessage = errData.detail || errData.message || defaultMessage;
        } catch {
            // Ignore parse errors
        }
        throw new Error(errorMessage);
    }
    // Return void for 204 No Content
    if (res.status === 204) return undefined;
    return res.json();
}`);

api = api.replace(/const res = await fetch\((.*?)\);\n    if \(!res\.ok\) throw new Error\("(.*?)"\);\n    return res\.json\(\);/g, 
'const res = await fetch($1);\n    return handleResponse(res, "$2");');

api = api.replace(/const res = await fetch\((.*?), \{(.*?)\}\);\n    if \(!res\.ok\) throw new Error\("(.*?)"\);\n    return res\.json\(\);/gs, 
'const res = await fetch($1, {$2});\n    return handleResponse(res, "$3");');

api = api.replace(/const res = await fetch\((.*?), \{(.*?)\}\);\n    return res\.json\(\);/gs, 
'const res = await fetch($1, {$2});\n    return handleResponse(res, "Request failed");');

api = api.replace(/const res = await fetch\((.*?), \{(.*?)\}\);\n    if \(!res\.ok\) throw new Error\("(.*?)"\);/gs, 
'const res = await fetch($1, {$2});\n    await handleResponse(res, "$3");');

fs.writeFileSync('src/lib/api.ts', api);
