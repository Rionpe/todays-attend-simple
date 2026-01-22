const SHEETDB_API = "https://sheetdb.io/api/v1/ik969ith0zja0";
let myInfo = null;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const data = await getInitialData();
        myInfo = data.myInfo;

        if (data.sunday) document.getElementById("attendanceDate").innerText = data.sunday;

        const sel = document.getElementById("groups");
        data.groups.forEach(g => {
            const o = document.createElement("option");
            o.value = g.목장ID;
            o.text = g.목장명;
            sel.appendChild(o);
        });

        if (myInfo && myInfo.groupId) {
            sel.value = myInfo.groupId;
            loadMembers();
        }

    } catch (err) { console.error(err); alert("초기 데이터 로딩 실패: "+err); }
});

async function getInitialData() {
    const [groupsRes, membersRes] = await Promise.all([
        fetch(`${SHEETDB_API}?sheet=목장`).then(r => r.json()),
        fetch(`${SHEETDB_API}?sheet=성도`).then(r => r.json())
    ]);

    const email = prompt("사용자 이메일 입력 (테스트용)");

    const me = membersRes.find(m => m.이메일 === email);
    const myGroup = groupsRes.find(g => g.목자ID === (me ? me.성도ID : null));
    const masterEmails = ["swjddbss@gmail.com", "ysmlsjlove1115@gmail.com"];
    const isMaster = masterEmails.includes(email);

    const myInfo = me ? { memberId: me.성도ID, groupId: me.목장ID, isLeader: !!myGroup, isMaster } : null;

    const today = new Date();
    today.setDate(today.getDate() - today.getDay());
    const sundayStr = today.toISOString().split('T')[0];

    return { groups: groupsRes, members: membersRes, myInfo, sunday: sundayStr };
}

async function loadMembers() {
    const groupId = document.getElementById("groups").value;
    if (!groupId) return;

    const members = await fetch(`${SHEETDB_API}?sheet=성도&목장ID=${groupId}`).then(r => r.json());
    const form = document.getElementById("form");
    form.innerHTML = members.map(mem => `
<div class="card">
  <div class="name">${mem.이름}</div>
  <div class="radio-group">
    <label><input type="radio" name="${mem.성도ID}" value="출석"><span>출석</span></label>
    <label><input type="radio" name="${mem.성도ID}" value="결석"><span>결석</span></label>
  </div>
  <input class="reason" placeholder="결석 사유 (선택)" id="reason_${mem.성도ID}">
  <input class="remark" placeholder="비고 (선택)" id="remark_${mem.성도ID}">
</div>
`).join('');

    document.getElementById("submitBtn").disabled = !(myInfo && (myInfo.isLeader || myInfo.isMaster));
}

async function submitData() {
    const groupId = document.getElementById("groups").value;
    const records = [];

    document.querySelectorAll(".card").forEach(card => {
        const name = card.querySelector(".name").innerText;
        const radio = card.querySelector("input[type=radio]:checked");
        if (!radio) return;

        const memberId = radio.name;
        const attend = radio.value;
        const reason = document.getElementById(`reason_${memberId}`).value;
        const remark = document.getElementById(`remark_${memberId}`).value;

        records.push({ groupId, memberId, name, attend, reason, remark });
    });

    if (records.length === 0) { alert("출석 상태 선택 필요"); return; }

    await fetch(`${SHEETDB_API}?sheet=출석_원본`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(records)
    });

    alert("출석 저장 완료!");
    loadMembers();
}
