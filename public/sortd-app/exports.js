/* ============================================================
   Sortd — exports.js
   CSV, Excel (.xlsx), and PDF download logic
   ============================================================ */

const Exports = (() => {

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function buildRows(groups, students) {
    const rows = [];
    for (const group of groups) {
      const members = group.memberIds.map(id => students.find(s => s.id === id)).filter(Boolean);
      for (const student of members) {
        rows.push({
          'Group':          group.label,
          'Name':           student.name,
          'UID':            student.uid,
          'REG No.':        student.regNo,
          'CGPA':           student.cgpa,
          'Group Avg CGPA': group.avgCgpa,
        });
      }
    }
    return rows;
  }

  /* ---------- CSV ---------- */
  function downloadCSV(groups, students) {
    const rows = buildRows(groups, students);
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map(r => headers.map(h => '"' + String(r[h]).replace(/"/g, '""') + '"').join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, 'sortd-groups-' + datestamp() + '.csv');
  }

  /* ---------- Excel (ExcelJS — full styling support) ---------- */
  async function downloadExcel(groups, students, lockedTeams) {
    if (typeof ExcelJS === 'undefined') {
      alert('ExcelJS library not loaded. Check your internet connection and refresh.');
      return;
    }

    const PALETTE = ['FFFFFF', 'DCE6F1']; // white and formal light blue

    const thinB = { style: 'thin', color: { argb: 'FF000000' } };
    const allBorders = { top: thinB, left: thinB, bottom: thinB, right: thinB };

    function sty(cell, bold, sz, fillHex, halign, wrap, colorArgb) {
      cell.font = { name: 'Times New Roman', bold: !!bold, size: sz || 11, color: { argb: colorArgb || 'FF000000' } };
      cell.alignment = { horizontal: halign || 'center', vertical: 'middle', wrapText: !!wrap };
      cell.border = allBorders;
      if (fillHex) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + fillHex } };
      }
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sortd';

    /* Sheet 1: Sortd Summary */
    const ws1 = wb.addWorksheet('Groups Summary');
    ws1.columns = [
      { width: 14 }, { width: 30 }, { width: 14 },
      { width: 16 }, { width: 8  }, { width: 10 },
    ];

    ws1.mergeCells('A1:F1');
    ws1.getCell('A1').value = 'Sortd — Project Groups';
    sty(ws1.getCell('A1'), true, 14, '6366F1', 'center', false, 'FFFFFFFF');
    ws1.getRow(1).height = 24;

    ws1.mergeCells('A2:F2');
    const d1 = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    ws1.getCell('A2').value = 'Generated: ' + d1 + '   |   ' + groups.length + ' groups   |   ' + students.length + ' students';
    sty(ws1.getCell('A2'), false, 10, 'EEF2FF', 'center');
    ws1.getRow(2).height = 18;

    const h1 = ws1.addRow(['Group', 'Name', 'UID', 'REG No.', 'CGPA', 'Avg CGPA']);
    h1.height = 20;
    h1.eachCell(c => sty(c, true, 11, 'C7D2FE', 'center'));

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const fill = PALETTE[gi % PALETTE.length];
      const members = g.memberIds.map(id => students.find(s => s.id === id)).filter(Boolean);
      for (const m of members) {
        const r = ws1.addRow([g.label, m.name, m.uid, m.regNo, m.cgpa, g.avgCgpa]);
        r.eachCell({ includeEmpty: true }, (cell, colNum) => {
          sty(cell, false, 11, fill, colNum === 2 ? 'left' : 'center');
        });
      }
    }

    /* Sheet 2: Official Department Format */
    const ws2 = wb.addWorksheet('Official List');
    ws2.columns = [
      { width: 8  }, { width: 30 }, { width: 14 }, { width: 18 },
      { width: 12 }, { width: 20 }, { width: 22 },
    ];

    ws2.mergeCells('A1:G1');
    ws2.getCell('A1').value = 'DEPARTMENT OF MECHANICAL ENGINEERING, RSET (AUTONOMOUS)';
    sty(ws2.getCell('A1'), true, 12, null, 'center');
    ws2.getRow(1).height = 22;

    ws2.mergeCells('A2:G2');
    ws2.getCell('A2').value = 'MINI PROJECT GROUPS';
    sty(ws2.getCell('A2'), true, 12, null, 'center');
    ws2.getRow(2).height = 22;

    const h2 = ws2.addRow(['Sl. No.', 'Name of Student', 'UID', 'University Reg. No.', 'Group', 'Topic', 'Name of Faculty (Guide)']);
    h2.height = 30;
    h2.eachCell(c => sty(c, true, 11, null, 'center', true));

    let rowNum = 4;
    let sl = 1;
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const fill = PALETTE[gi % PALETTE.length];
      const members = g.memberIds.map(id => students.find(s => s.id === id)).filter(Boolean);
      const gStart = rowNum;

      for (const m of members) {
        const r = ws2.addRow([sl, m.name, m.uid, m.regNo, '', '', '']);
        sty(r.getCell(1), false, 11, fill, 'center');
        sty(r.getCell(2), false, 12, fill, 'left');
        sty(r.getCell(3), false, 11, fill, 'center');
        sty(r.getCell(4), false, 11, fill, 'center');
        sty(r.getCell(5), false, 11, fill, 'center');
        sty(r.getCell(6), false, 11, fill, 'center');
        sty(r.getCell(7), false, 11, fill, 'center');
        sl++;
        rowNum++;
      }

      if (members.length > 1) {
        ws2.mergeCells(gStart, 5, rowNum - 1, 5);
        ws2.mergeCells(gStart, 6, rowNum - 1, 6);
        ws2.mergeCells(gStart, 7, rowNum - 1, 7);
      }

      const gc = ws2.getCell(gStart, 5);
      gc.value = g.label;
      gc.font = { name: 'Times New Roman', size: 11 };
      gc.alignment = { horizontal: 'center', vertical: 'middle' };
      gc.border = allBorders;
      gc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + fill } };
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerDownload(blob, 'sortd-groups-' + datestamp() + '.xlsx');
  }

  /* ---------- PDF ---------- */
  function downloadPDF(groups, students) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', putOnlyUsedFonts: true, compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 27, 75);
    doc.text('Sortd — Project Groups', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    const d2 = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text('Generated: ' + d2 + '  |  ' + groups.length + ' groups  |  ' + students.length + ' students', 14, 25);

    doc.setDrawColor(221, 217, 247);
    doc.setLineWidth(0.5);
    doc.line(14, 28, pageWidth - 14, 28);

    let y = 34;

    for (const group of groups) {
      const members = group.memberIds.map(id => students.find(s => s.id === id)).filter(Boolean);
      const estimatedH = 14 + members.length * 8;
      if (y + estimatedH > 272) { doc.addPage(); y = 20; }

      const headerColor = group.lockedTeamId ? [124, 58, 237] : [99, 102, 241];

      doc.autoTable({
        startY: y,
        head: [[{
          content: group.label + '   |   Avg CGPA: ' + group.avgCgpa + (group.lockedTeamId ? '   [LOCKED TEAM]' : ''),
          colSpan: 4,
          styles: { fillColor: headerColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        }]],
        body: members.map(s => [s.name, s.uid, s.regNo, s.cgpa.toFixed(2)]),
        columns: [
          { header: 'Name', dataKey: 0 },
          { header: 'UID', dataKey: 1 },
          { header: 'REG No.', dataKey: 2 },
          { header: 'CGPA', dataKey: 3 },
        ],
        theme: 'striped',
        headStyles: { fontSize: 8, halign: 'left' },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 35 },
          2: { cellWidth: 42 },
          3: { cellWidth: 20, halign: 'right' },
        },
        margin: { left: 14, right: 14 },
        didParseCell(data) {
          if (data.section === 'body') {
            const student = members[data.row.index];
            if (student && student.lockedTeamId) {
              data.cell.styles.fillColor = [243, 238, 254];
              data.cell.styles.textColor = [124, 58, 237];
            }
          }
        },
      });

      y = doc.lastAutoTable.finalY + 6;
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('Sortd | Page ' + i + ' of ' + pageCount, pageWidth / 2, 290, { align: 'center' });
    }

    doc.save('sortd-groups-' + datestamp() + '.pdf');
  }

  /* ---------- Session ---------- */
  function saveSession(state) {
    const snapshot = {
      version: '1.1',
      savedAt: new Date().toISOString(),
      students:    state.students,
      lockedTeams: state.lockedTeams,
      groupSize:   state.groupSize,
      groups:      state.groups,
      columnMap:   state.columnMap,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    triggerDownload(blob, 'sortd-session-' + datestamp() + '.json');
  }

  function loadSession(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const snapshot = JSON.parse(e.target.result);
        callback(null, snapshot);
      } catch {
        callback(new Error('Invalid session file.'));
      }
    };
    reader.readAsText(file);
  }

  function datestamp() {
    return new Date().toISOString().slice(0, 10);
  }

  return { downloadCSV, downloadExcel, downloadPDF, saveSession, loadSession };

})();
