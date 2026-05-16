/* ============================================================
   Sortd — ai.js
   All Gemini API interactions
   ============================================================ */

const AI = (() => {

  let _apiKey = 'AIzaSyDoMpXj9Zb8J4X3fF3Gpm0LIXXpSMwMito';
  const GEMINI_MODEL = 'gemini-2.0-flash';

  function setKey(key) { _apiKey = key.trim(); }
  function getKey()    { return _apiKey; }
  function hasKey()    { return _apiKey.length > 0; }

  async function call(prompt) {
    if (!hasKey()) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${_apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch {
      return null;
    }
  }

  function parseJSON(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      return null;
    }
  }

  /* ---------- Feature 1: Column Mapping ---------- */
  async function mapColumns(headers, sampleRows) {
    const prompt = `
You are a data analyst helping map columns from a student spreadsheet.

Column headers in the file: ${JSON.stringify(headers)}
Sample data rows (up to 3): ${JSON.stringify(sampleRows.slice(0, 3))}

The file may have extra irrelevant columns (like backlog counts, attendance, grades, serial numbers etc). Ignore those.

Map ONLY these 4 fields to the best matching column header:
- name: the student's full name (look for columns with actual names like "Student Name", "Name" etc)
- cgpa: the cumulative GPA on a 0-10 scale (look for "CGPA", "GPA", "Pointer" etc — NOT backlog counts or marks)
- uid: unique student ID or admission number (e.g. "U2306058", "UID", "Admission No")
- regNo: registration or roll number (e.g. "RET23ME060", "Reg No", "Roll No")

IMPORTANT: For cgpa, pick the column whose values are decimal numbers between 0 and 10 (like 7.9, 8.42, 9.2). Do NOT pick columns with large integers (those are backlog counts or marks).

Respond ONLY with a valid JSON object, no explanation, no markdown fences:
{"name": "...", "cgpa": "...", "uid": "...", "regNo": "..."}
If a field cannot be confidently mapped, use null.
`.trim();

    const raw = await call(prompt);
    return parseJSON(raw) ?? { name: null, cgpa: null, uid: null, regNo: null };
  }

  /* ---------- Feature 2: Anomaly Detection ---------- */
  async function validateData(students) {
    const sample = students.slice(0, 80).map((s, i) => ({
      row: i + 1, name: s.name, cgpa: s.cgpa, uid: s.uid, regNo: s.regNo,
    }));

    const prompt = `
You are a data validation assistant for a student database. Review this dataset and identify anomalies:
${JSON.stringify(sample)}

Check for:
1. CGPA values likely to be formatting errors (e.g. 92 instead of 9.2, values above 10)
2. Empty or missing name, uid, or regNo fields
3. Duplicate UID values
4. CGPA of exactly 0 (likely missing data)

Respond ONLY with a valid JSON array. Each item must follow this structure exactly:
[{"rowIndex": 1, "field": "cgpa", "value": "92", "message": "CGPA 92 may be a typo — did you mean 9.2?", "suggestion": 9.2}]
If there are no anomalies, respond with exactly: []
No explanation, no markdown fences.
`.trim();

    const raw = await call(prompt);
    return parseJSON(raw) ?? [];
  }

  /* ---------- Feature 3: Pre-formed Team Parse ---------- */
  async function parsePreformedTeam(inputText, students) {
    const roster = students.map(s => ({ id: s.id, name: s.name, uid: s.uid }));

    const prompt = `
You are a student roster assistant. A teacher typed: "${inputText}"

The teacher is identifying students who have already started a project together and must be kept in the same group.

Student roster:
${JSON.stringify(roster)}

Identify which students the teacher is referring to. Use fuzzy name matching or UID matching.

Respond ONLY with a valid JSON object, no explanation, no markdown:
{"matched": [{"id": "...", "name": "...", "uid": "..."}], "confidence": "high"}
Valid confidence values: "high", "medium", "low"
If no students found: {"matched": [], "confidence": "low"}
`.trim();

    const raw = await call(prompt);
    return parseJSON(raw) ?? { matched: [], confidence: 'low' };
  }

  /* ---------- Feature 4: Group Quality Feedback ---------- */
  async function groupFeedback(groups, students) {
    const summary = groups.map(g => ({
      label: g.label,
      avgCgpa: g.avgCgpa,
      memberCount: g.memberIds.length,
      hasLockedTeam: !!g.lockedTeamId,
      members: g.memberIds.map(id => {
        const s = students.find(st => st.id === id);
        return { name: s?.name ?? '?', cgpa: s?.cgpa ?? 0 };
      }),
    }));

    const lockedCount = groups.filter(g => g.lockedTeamId).length;

    const prompt = `
You are an academic group balancing assistant. Review these project groups generated for college students:
${JSON.stringify(summary)}

${lockedCount > 0 ? `Note: ${lockedCount} groups contain pre-formed teams that were kept together as requested.` : ''}

Provide brief, practical feedback for the teacher in 2-3 sentences:
1. Assess the overall CGPA balance (mention the range across groups)
2. Flag any group that seems significantly unbalanced
3. If helpful, suggest ONE specific swap to improve balance (Student A from Group X with Student B from Group Y)
4. Mention pre-formed teams if any were honoured

Write in plain, clear English. No bullet points. No markdown. No JSON.
`.trim();

    const raw = await call(prompt);
    return raw?.trim() ?? null;
  }

  return { setKey, getKey, hasKey, mapColumns, validateData, parsePreformedTeam, groupFeedback };

})();
