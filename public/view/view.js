import * as Common from '../common.js';

/***********************
 * View
 ***********************/
function showSection(email) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("viewSection").style.display = "block";
    loadAttendance(email);
}
async function loadAttendance(email) {
    const sundayStr = Common.getWeekSunday();

    const where = {
        입력자: email
    };

    const order = ['날짜 desc', '성도명 asc'];
    const list = await Common.getSheetData("출석_조회(읽기전용)", 20, where, order);
    const filtered = list.filter(l => {
        if (!l.날짜) return false;

        const dateParts = l.날짜.split(".").map(s => s.trim());
        const rowDateStr = `${dateParts[0]}-${dateParts[1].padStart(2,"0")}-${dateParts[2].padStart(2,"0")}`;

        return rowDateStr === sundayStr;
    });

    renderAttendance(filtered);
}

function renderAttendance(list) {
    const el = document.getElementById("attendanceResult");

    if (!list.length) {
        el.innerHTML = `<div class="empty-msg">❌ 조회된 출석 데이터가 없습니다.</div>`;
        return;
    }

    // 카드 단위로 그룹화 (날짜별)
    const grouped = {};

    list.forEach(row => {
        const date = row.날짜 || "날짜없음";
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(row);
    });

    el.innerHTML = Object.keys(grouped).sort((a,b)=>b.localeCompare(a)).map(date => {
        const rows = grouped[date];
        return `
        <div class="attendance-card">
          <div class="header">
            <span class="date">${date}</span>
          </div>
          ${rows.map(r => {
            const statusClass = r.출석상태 === "출석" ? "attend" : "absent";
            const statusText = r.출석상태;
            const remark = r.비고 || r.결석사유 || "";
            return `
              <div class="member-row">
                <div>
                  <div class="member-name">${r.성도명}</div>
                  ${remark ? `<div class="member-sub">${remark}</div>` : ""}
                </div>
                <div class="member-status ${statusClass}">${statusText}</div>
              </div>
            `;
        }).join('')}
        </div>
      `;
    }).join('');
}

/***********************
 * 자동 로그인
 ***********************/
window.addEventListener("load", () => {
    Common.initGSI((email) => {
        showSection(email);
    });
});
