const GOOGLE_SHEET_END_POINT = "https://sheets.googleapis.com/v4/spreadsheets";
const OAUTH_CLIENT_ID="382344058312-btj96hfuq3665e93evgaguhh14non63j.apps.googleusercontent.com"
const SHEET_ID="18FBUzr_iajDrYuXs78WSX4bntxvIGCd59fRCEqk9iDQ"

export function getWeekSunday() {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');

    // const hours = String(d.getHours()).padStart(2,'0');
    // const minutes = String(d.getMinutes()).padStart(2,'0');
    // const seconds = String(d.getSeconds()).padStart(2,'0');

    // console.log(`${yyyy}-${mm}-${dd} ${hours}:${minutes}:${seconds}`);
    return `${yyyy}-${mm}-${dd}`;
}

let tokenClient;
let accessToken = null;
export function initGSI(onSuccess) {
    if (!window.google) {
        console.error("Google library not loaded");
        return;
    }
    const SCOPES = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/userinfo.email',
        // 'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: SCOPES,
        callback: async (resp) => {
            if (resp.error) {
                console.warn("인증 과정에서 에러 발생:", resp.error);
                return;
            }
            accessToken = resp.access_token;
            const expiryTime = Date.now() + (resp.expires_in * 1000);
            localStorage.setItem('g_access_token', accessToken);
            localStorage.setItem('g_token_expiry', expiryTime); //1시간

            try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const profile = await res.json();
                localStorage.setItem('email', profile.email);

                if (onSuccess) onSuccess(profile.email);
            } catch (err) {
                console.error("유저 정보 로드 실패:", err);
            }
        }
    });
    tryAutoLogin(onSuccess);
}

async function tryAutoLogin(onSuccess) {
    const savedToken = localStorage.getItem('g_access_token');
    const expiry = localStorage.getItem('g_token_expiry');
    const savedEmail = localStorage.getItem('email');
    const now = Date.now();

    // 1. 토큰이 살아있으면 바로 사용
    if (savedToken && expiry && now < parseInt(expiry)) {
        console.log("기존 토큰 사용");
        accessToken = savedToken;
        onSuccess(savedEmail);
        return;
    }

    // 2. 토큰 죽었지만 이메일 기록 있으면 '조용히' 갱신 시도
    if (savedEmail) {
        console.log("토큰 갱신 시도...");
        tokenClient.requestAccessToken({ prompt: 'none', login_hint: savedEmail });
    }
    console.log("초기 사용자: 로그인 버튼 노출");
    const loginCon = document.getElementById('loginSection');
    const loginBtn = document.getElementById('btn-google-login');

    if (loginCon && loginBtn) {
        loginCon.style.display = 'flex';
        loginBtn.onclick = () => {
            tokenClient.requestAccessToken({ prompt: 'select_account' });
        };
    }
}

export async function getSheetData(sheetName, limit = 1000, where = {}, order = []) {
    if (!accessToken) {
        throw new Error("액세스 토큰이 없습니다. 로그인이 필요합니다.");
    }
    const url = `${GOOGLE_SHEET_END_POINT}/${SHEET_ID}/values/${encodeURIComponent(sheetName)}!A:Z`;
    // const params = new URLSearchParams({
    //     sheetName,
    //     limit,
    //     ...(Object.keys(where).length && { where: JSON.stringify(where) }),
    //     ...(order && { order })
    //     // _t: Date.now()
    // });
    // const url = `${END_POINT}/${SPREADSHEET_ID}?${params.toString()}`
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });
    if (!res.ok) {
        const errorDetail = await res.json();
        console.error("구글 시트 로드 실패:", errorDetail);
        throw new Error(`API 오류: ${res.status}`);
    }
    const json = await res.json();
    const rows = json.values;

    if (!rows || rows.length === 0) return [];
    const headers = rows[0];

    // 1. 객체 배열로 먼저 변환 (데이터 가공)
    let data = rows.slice(1).map(row => {
        const item = {};
        headers.forEach((header, index) => {
            item[header] = row[index] !== undefined ? row[index] : "";
        });
        return item;
    });

    // 2. WHERE 필터링 구현
    // 예: where = { 목장ID: "10", 성별: "남" }
    if (Object.keys(where).length > 0) {
        data = data.filter(item => {
            return Object.entries(where).every(([key, value]) => String(item[key]) === String(value));
        });
    }

    // 3. ORDER 정렬 구현
    // 예: order = "성도ID desc" 또는 "이름 asc"
    if (order) {
        const sortConditions = Array.isArray(order) ? order : [order];

        data.sort((a, b) => {
            for (const condition of sortConditions) {
                const [field, direction] = condition.split(' ');
                const isDesc = direction?.toLowerCase() === 'desc';

                let valA = a[field];
                let valB = b[field];

                if (!isNaN(valA) && !isNaN(valB) && valA !== "" && valB !== "") {
                    valA = Number(valA);
                    valB = Number(valB);
                }

                if (valA < valB) return isDesc ? 1 : -1;
                if (valA > valB) return isDesc ? -1 : 1;

            }
            return 0;
        });
    }
    // 4. LIMIT 구현
    return data.slice(0, limit);
}

export async function saveSheetData(sheetName, records) {
    if (!accessToken) throw new Error("로그인 필요");
    if (!records || records.length === 0) return;
    //헤더순서 먼저 가져옴
    const headerUrl = `${GOOGLE_SHEET_END_POINT}/${SHEET_ID}/values/${encodeURIComponent(sheetName)}!1:1`;
    const hRes = await fetch(headerUrl, { headers: { "Authorization": `Bearer ${accessToken}` } });
    const hJson = await hRes.json();
    const headers = hJson.values[0];
    const values = records.map(record => headers.map(header => record[header] || ""));
    const url = `${GOOGLE_SHEET_END_POINT}/${SHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ values })
    });

    return await res.json();

    // const responses = await Promise.all(
    //     records.map(row =>
    //         fetch("/api/sheetson", {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify({ sheetName, record: row })
    //         })
    //     )
    // );
    //
    // const failed = responses.find(r => !r.ok);
    // if (failed) {
    //     const errorData = await failed.json();
    //     throw new Error(`Sheetson 저장 실패: ${JSON.stringify(errorData)}`);
    // }
    //
    // return Promise.all(responses.map(r => r.json()));
}
