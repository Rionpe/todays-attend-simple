import * as Common from '../common.js'
let groups,members,myInfo,sunday,isMaster,currentUserEmail;

function loadMembers() {
    if (!isMaster && !myInfo) return;
    if (!members) return;
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

    const canSubmit = isMaster || (myInfo && myInfo.isLeader && groupId === myInfo.groupId);
    submitBtn.disabled = !canSubmit;
}

async function getInitialData() {
    const [groupsRes, membersRes] = await Promise.all([
        //GET: Goggle Sheet API(API_KEY) / POST: GAS(나의 권한)
        Common.getSheetData("목장", 100),
        Common.getSheetData("성도", 1000, {'상태': '활동'})
    ]);

    const sundayStr = Common.getWeekSunday();

    // 3️⃣ 마스터 계정
    const masterEmails = ["swjddbss@gmail.com", "ysmlsjlove1115@gmail.com", "dbsdndwo7899@gmail.com"]; //,
    const isMaster = masterEmails.includes(currentUserEmail);

    const me = membersRes.find(m => m.이메일 === currentUserEmail);
    const myInfo = me ? {
        memberId: me.성도ID,
        groupId: me.목장ID,
        isLeader: !!groupsRes.find(g => g.목장ID === me.목장ID),
        email: currentUserEmail
    } : null;

    return {
        groups: groupsRes,
        members: membersRes,
        myInfo,
        isMaster,
        sunday: sundayStr
    };
}

async function initAppWithEmail() {
    try {
        const data = await getInitialData();
        ({ groups, members, myInfo, isMaster, sunday } = data);

        if (!myInfo && !isMaster) {
            alert("등록된 사용자를 찾을 수 없습니다. 관리자에게 문의하세요.");
            return;
        }

        if (data.sunday) document.getElementById("attendanceDate").innerText = sunday;

        const sel = document.getElementById("groups");
        sel.innerHTML = "";
        groups.forEach(g => {
            const o = document.createElement("option");
            o.value = g.목장ID;
            o.text = g.목장명;
            sel.appendChild(o);
        });

        sel.value = myInfo?.groupId ? myInfo.groupId : groups[0].목장ID;
        loadMembers();
    } catch (err) {
        console.error(err);
        alert("초기 데이터 로딩 실패: " + err);
    }
}

function showSection(email) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("attendanceSection").style.display = "block";
    currentUserEmail = email;
    initAppWithEmail();
}

window.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById("groups");
    const submitBtn = document.getElementById("submitBtn");

    sel.addEventListener('change', loadMembers);
    submitBtn.addEventListener('click', submitData);
});

const head = document.querySelector('.head');
window.addEventListener('scroll', () => {
    head.classList.toggle('scrolled', window.scrollY > 0);
});

async function submitData() {
    if (!isMaster && !myInfo) {
        alert("로그인 권한이 없습니다.");
        return;
    }

    const groupId = document.getElementById("groups").value;
    const submitBtn = document.getElementById("submitBtn");
    const statusMsg = document.getElementById("statusMsg");
    // const logList = document.getElementById("logList");

    if (!isMaster) {
        if (!myInfo || groupId !== myInfo.groupId) {
            alert("본인 목장 출석만 등록할 수 있습니다.");
            return;
        }
    }

    const records = [];
    const sunday = Common.getWeekSunday();
    const 입력자 = currentUserEmail;

    const now = new Date();
    let hours = now.getHours();
    const ampm = hours >= 12 ? "오후" : "오전";
    hours = hours % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const yyyy = now.getFullYear();
    const mm = now.getMonth() + 1;
    const dd = now.getDate();
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

    // 1️⃣ 버튼 비활성화 & 상태 표시
    submitBtn.disabled = true;
    statusMsg.innerText = "데이터 전송 중…";

    try {
        await Common.saveSheetData("출석_원본", records);
        statusMsg.innerText = "출석 저장 완료! ✅";
        alert("출석 저장 완료! ✅");

    } catch (err) {
        console.error(err);
        statusMsg.innerText = "출석 저장 실패 ❌";
        alert("출석 저장 실패 ❌");
    } finally {
        submitBtn.disabled = false;
    }
}

window.addEventListener("load", () => {
    Common.initGSI((email) => {
        showSection(email);
    });
});
