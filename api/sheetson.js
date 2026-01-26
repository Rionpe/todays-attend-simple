const API_ENDPOINT = "https://api.sheetson.com";

const API_KEY = process.env.SHEETSON_API_KEY;
const SHEET_ID = process.env.SHEET_ID;

if (!API_KEY || !SHEET_ID) {
    console.warn("환경변수 누락: SHEETSON_API_KEY / SHEET_ID");
}
async function getSheetData(req, res) {
    const { sheetName, limit = 1000, where, order } = req.query;
    if (!sheetName) return res.status(400).json({ error: "sheetName 필요" });

    try {
        const limitNum = Number(limit) || 1000;
        let url = `${API_ENDPOINT}/v2/sheets/${encodeURIComponent(sheetName)}?spreadsheetId=${SHEET_ID}&apiKey=${API_KEY}&limit=${limitNum}`;

        if (where) url += `&where=${where}`;
        if (order) url += `&order=${order}`;

        const response = await fetch(url);
        const data = await response.json();

        return res.status(200).json(data.results || []);
    } catch (err) {
        console.error("GET 시트 데이터 오류:", err);
        return res.status(500).json({ error: "GET 서버 오류", detail: err.message });
    }
}

async function saveSheetData(req, res) {
    const { sheetName, record } = req.body;

    if (!sheetName || !record)
        return res.status(400).json({ error: "sheetName / record 필요" });

    try {
        const response = await fetch(
            `${API_ENDPOINT}/v2/sheets/${encodeURIComponent(sheetName)}`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    'X-Sheetson-Spreadsheet-Id': SHEET_ID,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(record)
            }
        );
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Sheetson 저장 실패",
                detail: data,
            });
        }

        return res.status(200).json(data);

    } catch (err) {
        console.error("POST 시트 저장 오류:", err);
        return res.status(500).json({ error: "POST 서버 오류", detail: err.message });
    }
}


export default async function handler(req, res) {
    if (!API_KEY || !SHEET_ID) {
        return res.status(500).json({ error: "서버 환경변수 누락" });
    }

    switch (req.method) {
        case "GET":
            return getSheetData(req, res);
        case "POST":
            return saveSheetData(req, res);
        default:
            res.setHeader("Allow", ["GET", "POST"]);
            return res.status(405).end("Method Not Allowed");
    }
}
