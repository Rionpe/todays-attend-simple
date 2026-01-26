window.API_ENDPOINT = 'https://api.sheetson.com';
window.API_KEY = 'gPITCMrQ4NpBBqgJSEPM3o4qTjmEIAzNs8IP1KEI25-WL2LzR_0xiFRm13Q'; //sheetson
window.SHEET_ID = '18FBUzr_iajDrYuXs78WSX4bntxvIGCd59fRCEqk9iDQ'; // 구글 스프레드 시트 ID
window.CLIENT_ID = '382344058312-btj96hfuq3665e93evgaguhh14non63j.apps.googleusercontent.com'; // 구글 oauth 클라이언트 ID

function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = str.length % 4;
    if (pad) {
        str += '='.repeat(4 - pad);
    }
    return atob(str);
}

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

export function initGSI() {
    if (!window.google?.accounts?.id) {
        console.error("GSI 스크립트가 아직 로드되지 않았습니다!");
        return;
    }

    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: true
    });

    google.accounts.id.renderButton(
        document.querySelector(".g_id_signin"),
        { theme: "outline", size: "large" }
    );

    google.accounts.id.prompt();
}

export function handleCredentialResponse(response) {
    const jwt = response.credential;
    if (!jwt) {
        console.error("Credential이 없습니다", response);
        return;
    }
    try {
        const payload = JSON.parse(base64UrlDecode(jwt.split('.')[1]));
        localStorage.setItem("email", payload.email);
        showSection(payload.email);
    } catch (err) {
        console.error("JWT decode 실패", err);
        alert("로그인 데이터가 올바르지 않습니다.");
    }
}

export async function getSheetData(sheetName, limit = 1000, where = {}, order = '') {
    let url = `${API_ENDPOINT}/v2/sheets/${encodeURIComponent(sheetName)}?apiKey=${API_KEY}&spreadsheetId=${SHEET_ID}&limit=${limit}`;

    if (where && Object.keys(where).length) {
        // encodeURIComponent 한 번만
        url += `&where=${encodeURIComponent(JSON.stringify(where))}`;
    }

    if (order) {
        url += `&order=${order}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.results || [];
}




