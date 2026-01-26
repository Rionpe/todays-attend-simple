let groups,members,myInfo,sunday;

const SHEETDB_API = "https://sheetdb.io/api/v1/ik969ith0zja0";

async function initAppWithEmail(email) {
    try {
        const data = await getInitialData(email);
        ({ groups, members, myInfo, sunday } = data);

        if (data.sunday) document.getElementById("attendanceDate").innerText = sunday;

        const sel = document.getElementById("groups");
        sel.innerHTML = "";
        groups.forEach(g => {
            const o = document.createElement("option");
            o.value = g.목장ID;
            o.text = g.목장명;
            sel.appendChild(o);
        });

        // 내 목장 선택 & 멤버 렌더링
        if (myInfo && myInfo.groupId) {
            sel.value = myInfo.groupId;
            loadMembers();
        }

    } catch (err) {
        console.error(err);
        alert("초기 데이터 로딩 실패: " + err);
    }
}

function loadMembers() {
    if (!myInfo || !members) return;

    const groupId = document.getElementById("groups").value;
    const submitBtn = document.getElementById("submitBtn");

    if (!groupId) {
        document.getElementById("form").innerHTML = "";
        submitBtn.disabled = true;
        return;
    }

    const membersToShow = members.filter(m => m.목장ID === groupId);

    const form = document.getElementById("form");
    form.innerHTML = membersToShow.map(mem => `
<div class="card">
  <div class="name">${mem.이름}</div>
  <div class="radio-group">
    <label><input type="radio" name="${mem.성도ID}" value="출석"><span>출석</span></label>
    <label><input type="radio" name="${mem.성도ID}" value="결석"><span>결석</span></label>
  </div>
  <input class="reason" placeholder="결석 사유 (선택)" id="reason_${mem.성도ID}">
  <input class="remark" placeholder="비고 (선택)" id="remark_${mem.성도ID}">
</div>`).join('');

    // ✅ 버튼 활성화 조건 (중요)
    const canSubmit =
        myInfo.isMaster ||
        (myInfo.isLeader && groupId === myInfo.groupId);

    submitBtn.disabled = !canSubmit;
}

async function getInitialData(email) {
    const [groupsRes, membersRes] = await Promise.all([
        fetch(`${SHEETDB_API}?sheet=목장`).then(r => r.json()),
        fetch(`${SHEETDB_API}?sheet=성도`).then(r => r.json())
    ]);

    const sundayStr = getWeekSunday();

    // 1️⃣ 로그인한 사용자 찾기
    const me = membersRes.find(m => m.이메일 === email);
    if (!me) {
        return { groups: groupsRes, members: membersRes, myInfo: null, sunday: sundayStr };
    }

    // 2️⃣ 내 목장 정보
    const myGroup = groupsRes.find(g => g.목장ID === me.목장ID);

    // 3️⃣ 마스터 계정 여부
    const masterEmails = ["swjddbss@gmail.com", "ysmlsjlove1115@gmail.com"]; //, "dbsdndwo0224@gmail.com"
    const isMaster = masterEmails.includes(email);

    // 4️⃣ 로그인 사용자 정보
    const myInfo = {
        memberId: me.성도ID,
        groupId: me.목장ID,
        isLeader: !!myGroup,
        isMaster,
        email
    };

    return {
        groups: groupsRes,   // 모든 목장
        members: membersRes, // 모든 성도
        myInfo,
        sunday: sundayStr
    };
}

function getWeekSunday() {
    const d = new Date();
    // 이번 주 일요일(UTC 기준)
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0,0,0,0);

    // 화면 표시용: 한국 시간 문자열
    const kst = new Date(d.getTime() + 9*60*60*1000); // UTC +9h
    const yyyy = kst.getFullYear();
    const mm = String(kst.getMonth() + 1).padStart(2, '0');
    const dd = String(kst.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}

async function submitData() {
    if (!myInfo || !myInfo.email) {
        alert("로그인 필요");
        return;
    }

    const groupId = document.getElementById("groups").value;
    // 🚫 다른 목장 전송 차단 (마스터 제외)
    if (!myInfo.isMaster && groupId !== myInfo.groupId) {
        alert("본인 목장 출석만 등록할 수 있습니다.");
        return;
    }
    const records = [];

    const sunday = getWeekSunday(); // 지난 일요일
    const 입력자 = myInfo.email;

    const now = new Date();
    const kst = new Date(now.getTime() + 9*60*60*1000);
    let hours = kst.getHours();
    const ampm = hours >= 12 ? "오후" : "오전";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const minutes = String(kst.getMinutes()).padStart(2, "0");
    const seconds = String(kst.getSeconds()).padStart(2, "0");
    const yyyy = kst.getFullYear();
    const mm = kst.getMonth() + 1;
    const dd = kst.getDate();

    const 입력시간 = `${yyyy}. ${mm}. ${dd} ${ampm} ${hours}:${minutes}:${seconds}`;

    document.querySelectorAll(".card").forEach(card => {
        const name = card.querySelector(".name").innerText;
        const radio = card.querySelector("input[type=radio]:checked");
        if (!radio) return;

        const memberId = radio.name;
        const attend = radio.value;
        const reason = document.getElementById(`reason_${memberId}`).value;
        const remark = document.getElementById(`remark_${memberId}`).value;

        records.push({
            날짜: sunday,
            성도명: name,
            출석상태: attend,
            결석사유: reason || "",
            비고: remark || "",
            입력자,
            입력시간
        });
    });

    if (!records.length) {
        alert("출석 상태 선택 필요");
        return;
    }

    console.log("SheetDB로 보낼 데이터:", records);

    try {
        await fetch(`${SHEETDB_API}?sheet=출석_원본`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: records })
        });
        alert("출석 저장 완료!");
        loadMembers();
    } catch (err) {
        console.error(err);
        alert("출석 저장 실패: " + err);
    }
}


// --- 헤더 스크롤 그림자 ---
const head = document.querySelector('.head');
window.addEventListener('scroll', () => {
    head.classList.toggle('scrolled', window.scrollY > 0);
});

function handleCredentialResponse(response) {
    const jwt = response.credential;
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    console.log("로그인 이메일:", payload.email);

    // 로그인 성공 → 화면 표시
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("attendanceSection").style.display = "block";

    // 이메일로 앱 초기화
    initAppWithEmail(payload.email);
}

function initGSI() {
    if (!window.google?.accounts?.id) {
        console.error("GSI 스크립트가 아직 로드되지 않았습니다!");
        return;
    }

    google.accounts.id.initialize({
        client_id: "382344058312-btj96hfuq3665e93evgaguhh14non63j.apps.googleusercontent.com",
        callback: handleCredentialResponse,
        auto_select: true
    });

    google.accounts.id.renderButton(
        document.querySelector(".g_id_signin"),
        { theme: "outline", size: "large" }
    );

    google.accounts.id.prompt(); // 자동 로그인 시도
}

window.addEventListener("load", initGSI);

window.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById("groups");
    const submitBtn = document.getElementById("submitBtn");

    sel.addEventListener('change', loadMembers);
    submitBtn.addEventListener('click', submitData);
});


// const SHEET_ID = "18FBUzr_iajDrYuXs78WSX4bntxvIGCd59fRCEqk9iDQ/edit?pli=1&gid=821494766#gid=821494766";
// const API_KEY = "382344058312-btj96hfuq3665e93evgaguhh14non63j.apps.googleusercontent.com";
// const RANGE = "목장"; // 시트명!범위 목장!A1:G