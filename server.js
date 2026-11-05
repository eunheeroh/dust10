// Node.js 내장 모듈 불러오기
const http = require('http');
const fs = require('fs');
const path = require('path');

// .env.local 파일에서 환경변수 로드하는 간단한 헬퍼
function loadEnv() {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...values] = trimmed.split('=');
                if (key && values.length > 0) {
                    process.env[key.trim()] = values.join('=').trim();
                }
            }
        });
    }
}

// 환경변수 로드 실행
loadEnv();

// Vercel 서버리스 함수 핸들러 불러오기
const dustHandler = require('./api/dust.js');

// 포트 번호 설정
const PORT = 3000;

// MIME 타입 매핑 객체
const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'text/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

// HTTP 서버 생성
const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;

    // 1. /api/dust 요청 처리 (Vercel 서버리스 함수 에뮬레이션)
    if (pathname === '/api/dust') {
        const query = Object.fromEntries(parsedUrl.searchParams);
        req.query = query;

        // Vercel Response 헬퍼 함수 구현
        res.status = (statusCode) => {
            res.statusCode = statusCode;
            return res;
        };
        res.json = (data) => {
            res.setHeader('Content-Type', 'application/json; charset=UTF-8');
            res.end(JSON.stringify(data));
            return res;
        };

        try {
            await dustHandler(req, res);
        } catch (err) {
            console.error('API Error:', err);
            res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
        }
        return;
    }

    // 2. 정적 파일 서비스 (index.html, style.css, script.js 등)
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
                res.end(`서버 오류: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// 서버 실행 및 대기
server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 공기 신호등 개발 서버가 실행되었습니다!`);
    console.log(`👉 브라우저 주소: http://localhost:${PORT}`);
    console.log(`========================================\n`);
});

