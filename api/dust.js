// Vercel 서버리스 함수 핸들러
module.exports = async function handler(req, res) {
    // CORS 헤더 설정 (필요 시 외부 요청 허용)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    // OPTIONS 사전 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 쿼리스트링에서 sido(시도 이름) 추출 및 기본값 '서울' 설정
    const sido = req.query.sido || '서울';

    // 환경변수에서 에어코리아 인코딩 인증키 읽기
    const airkoreaKey = process.env.AIRKOREA_KEY;

    // 환경변수에 인증키가 설정되어 있지 않을 경우 에러 반환
    if (!airkoreaKey) {
        return res.status(500).json({
            error: '서버 환경변수(AIRKOREA_KEY)가 설정되지 않았습니다.'
        });
    }

    try {
        // 이미 퍼센트 인코딩된 키인 경우 이중 인코딩을 방지하고, 디코딩 키인 경우 인코딩 수행
        const encodedServiceKey = airkoreaKey.includes('%') ? airkoreaKey : encodeURIComponent(airkoreaKey);
        const encodedSido = encodeURIComponent(sido);
        const targetUrl = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${encodedServiceKey}&returnType=json&numOfRows=100&pageNo=1&sidoName=${encodedSido}&ver=1.3`;

        // 공공데이터 API 서버로 비동기 GET 요청 전송
        const apiResponse = await fetch(targetUrl);
        // 응답 내용을 텍스트 형식으로 수신 (XML 에러 대응 목적)
        const responseText = await apiResponse.text();

        // 수신된 텍스트를 JSON으로 파싱 시도
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            // JSON 파싱 실패 시 XML 에러 응답이므로 사용자 친화적 에러 메시지 반환
            return res.status(400).json({
                error: '인증키 또는 요청값을 확인해주세요'
            });
        }

        // 응답 헤더의 resultCode 검증
        const resultCode = data?.response?.header?.resultCode;
        const resultMsg = data?.response?.header?.resultMsg;

        // 결과 코드가 성공(00)이 아닐 경우 한국어 메시지로 클라이언트에 알림
        if (resultCode && resultCode !== '00') {
            return res.status(400).json({
                error: `공공데이터 API 오류가 발생했습니다: ${resultMsg || '원인 불명'} (코드: ${resultCode})`
            });
        }

        // 정상 데이터인 경우 클라이언트에 200 응답과 함께 전달
        return res.status(200).json(data);
    } catch (serverError) {
        // 서버 내부 통신 오류 발생 시 예외 처리
        return res.status(500).json({
            error: '외부 API 서버와의 통신 중 오류가 발생했습니다.'
        });
    }
};

