// Vercel 서버리스 프록시 API 엔드포인트 주소
const PROXY_API_URL = '/api/dust';

// 시도 선택 드롭다운 DOM 요소 가져오기
const sidoSelect = document.getElementById('sidoSelect');

// 신호등 카드 전체 래퍼 요소 가져오기
const trafficLightCard = document.getElementById('trafficLightCard');

// 상태 이모지 엘리먼트 가져오기
const statusEmojiEl = document.getElementById('statusEmoji');

// 상태 텍스트 엘리먼트 가져오기
const statusTextEl = document.getElementById('statusText');

// 평균 미세먼지 수치 엘리먼트 가져오기
const avgValueEl = document.getElementById('avgValue');

// 행동 가이드 안내 문구 배너 엘리먼트 가져오기
const guideBannerEl = document.getElementById('guideBanner');

// 기준 시각 표시 엘리먼트 가져오기
const standardTimeEl = document.getElementById('standardTime');

// 측정소 카드 그리드 컨테이너 엘리먼트 가져오기
const cardGrid = document.getElementById('cardGrid');

// 등급(1~4)에 따른 CSS 클래스 및 등급 명칭 반환 함수
function getGradeMeta(grade) {
    // 1등급: 좋음
    if (grade === '1') return { className: 'grade-1', label: '좋음' };
    // 2등급: 보통
    if (grade === '2') return { className: 'grade-2', label: '보통' };
    // 3등급: 나쁨
    if (grade === '3') return { className: 'grade-3', label: '나쁨' };
    // 4등급: 매우나쁨
    if (grade === '4') return { className: 'grade-4', label: '매우나쁨' };
    // 정보 없음/비어있음 처리
    return { className: 'grade-none', label: '정보 없음' };
}

// 미세먼지 수치 포맷팅 함수 (값이 '-'이거나 누락되면 '측정 안 됨'으로 표시)
function formatDustValue(value) {
    // 값이 없거나 대시(-)인 경우 '측정 안 됨' 문자열 반환
    if (!value || value.trim() === '-') {
        return '측정 안 됨';
    }
    // 정상 수치일 경우 단위(㎍/㎥)와 함께 반환
    return `${value} ㎍/㎥`;
}

// 날짜 문자열(예: '2026-10-28 16:00')을 '2026년 10월 28일 16시 기준' 형식의 한국어로 변환하는 함수
function formatKoreanTime(dataTimeStr) {
    // 데이터가 없으면 기본값 반환
    if (!dataTimeStr || dataTimeStr === '-') return '기준 시각 정보 없음';

    // 정규식을 사용해 연, 월, 일, 시 파싱
    const match = dataTimeStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2})/);
    // 패턴이 일치하면 한국어 형식 문자열로 조립
    if (match) {
        const year = match[1];
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        const hour = parseInt(match[4], 10);
        return `${year}년 ${month}월 ${day}일 ${hour}시 기준`;
    }

    // 일치하지 않을 경우 원본 뒤에 '기준' 접미사 부여
    return `${dataTimeStr} 기준`;
}

// 로딩 상태를 UI에 표시하는 함수
function setLoadingState() {
    // 신호등 테마 초기화
    trafficLightCard.className = 'traffic-light-card';
    // 상태 이모지를 모래시계로 변경
    statusEmojiEl.textContent = '⏳';
    // 상태 텍스트를 로딩 알림으로 변경
    statusTextEl.textContent = '불러오는 중...';
    // 평균 수치 초기화
    avgValueEl.textContent = '-';
    // 기준 시각 로딩 상태로 변경
    standardTimeEl.textContent = '데이터를 불러오는 중...';
    // 안내 배너 문구 설정
    guideBannerEl.textContent = '최신 대기오염 정보를 받아오고 있습니다...';
    // 카드 그리드 영역에 로딩 메시지 출력
    cardGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px 0;">측정소 목록을 불러오는 중...</p>';
}

// Vercel 서버리스 함수(/api/dust)를 호출하여 대기질 데이터를 받아오는 비동기 함수
async function fetchAirQualityData(sidoName) {
    // 로딩 화면 UI 적용
    setLoadingState();

    try {
        // 내부 서버리스 API로 GET 요청 (sido 쿼리 전달)
        const response = await fetch(`${PROXY_API_URL}?sido=${encodeURIComponent(sidoName)}`);
        // 응답 본문을 JSON 객체로 파싱
        const result = await response.json();

        // 서버리스 함수에서 에러 응답이 반환된 경우 예외 발생
        if (!response.ok || result.error) {
            throw new Error(result.error || `요청 실패 (상태 코드: ${response.status})`);
        }

        // 응답 데이터에서 측정소 목록(items) 추출
        const items = result.response?.body?.items || [];

        // 데이터가 비어있을 경우 안내
        if (items.length === 0) {
            statusEmojiEl.textContent = '⚪';
            statusTextEl.textContent = '데이터 없음';
            guideBannerEl.textContent = '조회 가능한 측정소 데이터가 없습니다.';
            cardGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b;">측정소 데이터가 존재하지 않습니다.</p>';
            return;
        }

        // 받아온 데이터를 바탕으로 화면 렌더링
        renderData(items);
    } catch (error) {
        // 에러 콘솔 출력
        console.error('데이터 조회 오류:', error);
        // 에러 시 신호등 영역 표시
        statusEmojiEl.textContent = '⚠️';
        statusTextEl.textContent = '조회 실패';
        avgValueEl.textContent = '-';
        guideBannerEl.textContent = error.message;
        standardTimeEl.textContent = '오류 발생';
        // 카드 컨테이너에 에러 메시지 출력
        cardGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #dc2626; font-weight: bold; padding: 30px 0;">${error.message}</p>`;
    }
}

// 평균 미세먼지 수치를 바탕으로 종합 대표 상태 및 안내 문구를 반환하는 함수
function evaluateAirStatus(avgValue) {
    // 수치 30 이하: 좋음 (파랑)
    if (avgValue <= 30) {
        return {
            emoji: '🔵',
            text: '좋음',
            themeClass: 'theme-good',
            guide: '공기가 깨끗해요! 환기와 야외활동을 추천해요'
        };
    }
    // 수치 80 이하: 보통 (초록)
    if (avgValue <= 80) {
        return {
            emoji: '🟢',
            text: '보통',
            themeClass: 'theme-normal',
            guide: '무난한 공기질이에요. 일상생활에 지장 없어요'
        };
    }
    // 수치 150 이하: 나쁨 (주황)
    if (avgValue <= 150) {
        return {
            emoji: '🟠',
            text: '나쁨',
            themeClass: 'theme-bad',
            guide: '외출 시 마스크를 챙기세요'
        };
    }
    // 수치 151 이상: 매우나쁨 (빨강)
    return {
        emoji: '🔴',
        text: '매우나쁨',
        themeClass: 'theme-very-bad',
        guide: '외출 시 마스크를 챙기세요 (야외활동 자제)'
    };
}

// 측정소 목록과 신호등 대시보드를 렌더링하는 함수
function renderData(items) {
    // 유효한 미세먼지 수치 총합 변수
    let totalPm10 = 0;
    // 유효한 측정소 개수 카운트 변수
    let validCount = 0;
    // 최신 측정 시각 저장을 위한 변수
    let latestTime = '';

    // 기존 카드 목록 비우기
    cardGrid.innerHTML = '';

    // 각 측정소 순회하며 카드 생성 및 데이터 집계
    items.forEach(item => {
        // 측정소 정보 추출
        const stationName = item.stationName || '알 수 없음';
        const pm10Value = item.pm10Value;
        const pm25Value = item.pm25Value;
        const dataTime = item.dataTime || '';
        const pm10Grade = item.pm10Grade;

        // 대표 시간 설정을 위해 첫 번째 유효 시각 보관
        if (!latestTime && dataTime) {
            latestTime = dataTime;
        }

        // '-'가 아니고 유효한 숫자면 평균 집계에 포함
        if (pm10Value && pm10Value.trim() !== '-' && !isNaN(Number(pm10Value))) {
            totalPm10 += Number(pm10Value);
            validCount += 1;
        }

        // 등급 메타 정보(CSS 클래스, 한글 라벨) 가져오기
        const gradeMeta = getGradeMeta(pm10Grade);

        // 측정 시각 한국어 변환
        const formattedItemTime = formatKoreanTime(dataTime);

        // 카드 엘리먼트 생성
        const card = document.createElement('div');
        // 등급별 은은한 배경/테두리 클래스 적용
        card.className = `card ${gradeMeta.className}`;

        // 카드 내부 구조 생성 (헤더 뱃지, 미세먼지, 초미세먼지, 한국어 시각)
        card.innerHTML = `
            <div class="card-header">
                <span class="card-station">${stationName}</span>
                <span class="card-badge">${gradeMeta.label}</span>
            </div>
            <div class="card-info">
                <span>미세먼지 (PM10)</span>
                <strong>${formatDustValue(pm10Value)}</strong>
            </div>
            <div class="card-info">
                <span>초미세먼지 (PM2.5)</span>
                <strong>${formatDustValue(pm25Value)}</strong>
            </div>
            <div class="card-time">${formattedItemTime}</div>
        `;

        // 카드 그리드에 추가
        cardGrid.appendChild(card);
    });

    // 상단 대표 기준 시각을 한국어로 업데이트
    standardTimeEl.textContent = formatKoreanTime(latestTime);

    // 유효한 측정값이 존재하면 평균 계산 및 신호등 상태 갱신
    if (validCount > 0) {
        const average = Math.round(totalPm10 / validCount);
        // 평균 수치 출력
        avgValueEl.textContent = average;

        // 수치 기반 신호등 상태 평가
        const airStatus = evaluateAirStatus(average);

        // 신호등 테마 클래스 반영
        trafficLightCard.className = `traffic-light-card ${airStatus.themeClass}`;
        // 이모지 반영
        statusEmojiEl.textContent = airStatus.emoji;
        // 상태 텍스트 반영
        statusTextEl.textContent = airStatus.text;
        // 행동 가이드 문구 반영
        guideBannerEl.textContent = airStatus.guide;
    } else {
        // 유효 측정값이 없는 경우
        trafficLightCard.className = 'traffic-light-card';
        statusEmojiEl.textContent = '⚪';
        statusTextEl.textContent = '측정 안 됨';
        avgValueEl.textContent = '-';
        guideBannerEl.textContent = '유효한 미세먼지 측정 정보가 없습니다.';
    }
}

// 드롭다운 변경 시 해당 시도의 정보를 즉시 새로고침
sidoSelect.addEventListener('change', (e) => {
    fetchAirQualityData(e.target.value);
});

// 페이지 첫 진입 시 선택된 지역(서울)의 데이터를 바로 로드
window.addEventListener('DOMContentLoaded', () => {
    fetchAirQualityData(sidoSelect.value);
});
