const RANGE = "목장"; // 시트명!범위 목장!A1:G
const SHEET_ID = "18FBUzr_iajDrYuXs78WSX4bntxvIGCd59fRCEqk9iDQ/edit?pli=1&gid=821494766#gid=821494766";
const CLIENT_ID = "382344058312-btj96hfuq3665e93evgaguhh14non63j.apps.googleusercontent.com";
const API_KEY = "AIzaSyCMtN5Rr4BU_IRubc9JL0tnPosiHNI0dTM";


let groups = [], members = [], myInfo = null;
let token; // OAuth2 토큰
let myEmail = "";

// --- Sheets API 호출 ---
async function getSheetData(range) {
    const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`,
        { headers: { "Authorization": `Bearer ${token}` } }
    );
    const data = await res.json();
    return data.values || [];
}

async function appendSheetData(range, records) {
    const values = records.map(r => Object.values(r));
    const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ values })
        }
    );
    return res.json();
}


// --- 로그인 후 처리 ---
async function handleCredentialResponse(response) {
    const jwt = response.credential;
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    myEmail = payload.email;
    console.log("로그인 이메일:", myEmail);

    // 화면 표시
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("attendanceSection").style.display = "block";

    // OAuth2 토큰 요청 (자동으로)
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
        callback: async (tokenResponse) => {
            token = tokenResponse.access_token;
            await initAppWithEmail();
        }
    });
    tokenClient.requestAccessToken({ prompt: 'consent' }); // 자동 토큰 요청
}

// --- 앱 초기화 ---
async function initAppWithEmail() {
    // 1️⃣ 데이터 가져오기
    const groupData = await getSheetData("목장!A2:B"); // 목장ID, 목장명
    const memberData = await getSheetData("성도!A2:D"); // 성도ID, 이름, 목장ID, 이메일

    groups = groupData.map(r => ({ 목장ID: r[0], 목장명: r[1] }));
    members = memberData.map(r => ({ 성도ID: r[0], 이름: r[1], 목장ID: r[2], 이메일: r[3] }));

    // 로그인한 사용자 정보
    const me = members.find(m => m.이메일 === myEmail);
    if (me) {
        myInfo = { memberId: me.성도ID, groupId: me.목장ID, myEmail, isMaster: false };
    }

    // 목장 select 채우기
    const sel = document.getElementById("groups");
    sel.innerHTML = "";
    groups.forEach(g => {
        const o = document.createElement("option");
        o.value = g.목장ID;
        o.text = g.목장명;
        sel.appendChild(o);
    });

    // 내 목장 선택
    if (myInfo && myInfo.groupId) sel.value = myInfo.groupId;

    loadMembers();
}

// --- 멤버 렌더링 ---
function loadMembers() {
    if (!members) return;
    const groupId = document.getElementById("groups").value;
    const form = document.getElementById("form");
    form.innerHTML = "";

    const filtered = members.filter(m => m.목장ID === groupId);
    filtered.forEach(m => {
        form.innerHTML += `
        <div class="card">
            <div class="name">${m.이름}</div>
            <div class="radio-group">
                <label><input type="radio" name="${m.성도ID}" value="출석"><span>출석</span></label>
                <label><input type="radio" name="${m.성도ID}" value="결석"><span>결석</span></label>
            </div>
            <input class="remark" placeholder="비고" id="remark_${m.성도ID}">
        </div>`;
    });
}

// --- 출석 제출 ---
async function submitData() {
    if (!token || !myInfo) { alert("로그인 필요"); return; }

    const groupId = document.getElementById("groups").value;
    if (!myInfo.isMaster && groupId !== myInfo.groupId) {
        alert("본인 목장만 등록 가능");
        return;
    }

    const cards = document.querySelectorAll(".card");
    const records = [];
    const sunday = new Date().toISOString().slice(0,10);

    cards.forEach(card => {
        const name = card.querySelector(".name").innerText;
        const radio = card.querySelector("input[type=radio]:checked");
        if (!radio) return;

        const memberId = radio.name;
        const attend = radio.value;
        const remark = document.getElementById(`remark_${memberId}`).value || "";

        records.push([sunday, name, attend, remark, myInfo.email]);
    });

    if (!records.length) { alert("출석 선택 필요"); return; }

    await appendSheetData("출석_원본!A:E", records, token);
    alert("출석 완료!");
    loadMembers();
}

// --- GSI 초기화 ---
function initGSI() {
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: true
    });
    google.accounts.id.renderButton(
        document.querySelector(".g_id_signin"),
        { theme: "outline", size: "large" }
    );
    // google.accounts.id.prompt();
}

window.addEventListener("load", initGSI);
// document.getElementById("groups").addEventListener('change', loadMembers);
// document.getElementById("submitBtn").addEventListener('click', submitData);