const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
    '.json': 'application/json',
    '.txt': 'text/plain; charset=utf-8'
};

function parseFrontMatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { data: {}, content };
    const yaml = match[1];
    const body = match[2];
    const data = {};
    for (const line of yaml.split(/\r?\n/)) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
            const key = line.slice(0, colonIdx).trim();
            const val = line.slice(colonIdx + 1).trim();
            data[key] = val;
        }
    }
    return { data, content: body };
}

function renderJekyll(filePath, urlPath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = parseFrontMatter(raw);
    if (!data.layout) return raw;

    const layoutPath = path.join(ROOT, '_layouts', `${data.layout}.html`);
    if (!fs.existsSync(layoutPath)) return content;
    let layout = fs.readFileSync(layoutPath, 'utf8');

    // Includes
    layout = layout.replace(/\{%\s*include\s+([\w\.-]+)\s*%\}/g, (_, includeFile) => {
        const incPath = path.join(ROOT, '_includes', includeFile);
        if (fs.existsSync(incPath)) {
            let incContent = fs.readFileSync(incPath, 'utf8');
            const isHome = (urlPath === '/' || urlPath === '/index.html');
            incContent = incContent.replace(/\{%\s*unless\s+page\.url\s*==\s*'\/'\s*or\s*page\.url\s*==\s*'\/index\.html'\s*%\}([\s\S]*?)\{%\s*endunless\s*%\}/g, isHome ? '' : '$1');
            return incContent;
        }
        return '';
    });

    // Page variables
    layout = layout.replace(/\{\{\s*page\.title\s*\}\}/g, data.title || '');
    layout = layout.replace(/\{\{\s*page\.body_class\s*\}\}/g, data.body_class || '');
    layout = layout.replace(/\{\{\s*page\.description\s*\}\}/g, data.description || '');
    layout = layout.replace(/\{\{\s*page\.url[^}]*\}\}/g, urlPath.replace('.html', ''));
    layout = layout.replace(/\{\{\s*site\.time[^}]*\}\}/g, String(new Date().getFullYear()));
    layout = layout.replace(/\{\{\s*content\s*\}\}/g, content);

    // Conditional home scripts
    const isHome = (urlPath === '/' || urlPath === '/index.html');
    layout = layout.replace(/\{%\s*if\s+page\.url\s*==\s*"\/\"\s*or\s*page\.url\s*==\s*"\/index\.html"\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, isHome ? '$1' : '');

    return layout;
}

const server = http.createServer((req, res) => {
    
    let reqUrl;
    try {
        reqUrl = decodeURI(req.url.split('?')[0]);
    } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('400 Bad Request');
        return;
    }

    const candidatePath = path.join(ROOT, reqUrl);
    const insideSite = candidatePath === ROOT || candidatePath.startsWith(ROOT + path.sep);
    const hasHiddenPart = reqUrl.split(/[\\/]/).some(part => part.startsWith('.'));
    if (!insideSite || hasHiddenPart) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
    }

    let resolvedFile = null;

    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
        const indexPath = path.join(candidatePath, 'index.html');
        if (fs.existsSync(indexPath)) resolvedFile = indexPath;
    } else if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        resolvedFile = candidatePath;
    } else if (fs.existsSync(candidatePath + '.html')) {
        resolvedFile = candidatePath + '.html';
    }

    if (!resolvedFile) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
    }

    const ext = path.extname(resolvedFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (ext === '.html') {
        const rendered = renderJekyll(resolvedFile, reqUrl);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(rendered);
    } else {
        const stream = fs.createReadStream(resolvedFile);
        res.writeHead(200, { 'Content-Type': contentType });
        stream.pipe(res);
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`- Homepage:       http://localhost:${PORT}/`);
    console.log(`- Support:        http://localhost:${PORT}/smallthings`);
    console.log(`- Privacy Policy: http://localhost:${PORT}/smallthings/privacy`);
});
