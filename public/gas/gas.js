const GAS_URL = "https://script.google.com/macros/s/AKfycbz5znj12CgPZ8ggigiatpznYHhq8dgEccauZN1nIYNDPHqh_rJvp3t3EExqbSyDunkc/exec";

// // 데이터 가져오기
// export async function getSheetData(sheetName) {
//     try {
//         const res = await fetch(`${GAS_URL}?sheetName=${encodeURIComponent(sheetName)}`, {
//             method: "GET",
//             redirect: "follow"
//         });
//         return await res.json();
//     } catch (error) {
//         console.error("데이터 로드 실패:", error);
//     }
// }

// 데이터 저장하기
export async function saveSheetData(sheetName, record) {
    const res = await fetch(GAS_URL, {
        method: "POST",
        headers: {
            "Content-Type" : 'text/plain'
        },
        // mode: 'no-cors',
        redirect: "follow",
        body: JSON.stringify({ sheetName, record })
    });
    return await res.json();
}