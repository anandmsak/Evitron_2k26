/**
 * EVITRON 2K26 - National Level Technical Symposium & Workshop
 * Department of Electronics and Communication Engineering
 * Muthayammal Engineering College
 * 
 * Google Apps Script Webhook for Real-Time Registration Synchronization
 * Compatible with EVITRON 2K26 Backend Payload
 */

const SHEET_NAME = 'Registrations';

const HEADERS = [
  'Registration ID',
  'Timestamp',
  'Track / Category',
  'Registered Events',
  'Team Leader Name',
  'Leader Email',
  'Leader Mobile',
  'College Name',
  'Department',
  'Year',
  'Team Size',
  'Member 2 Details',
  'Member 3 Details',
  'Total Fee (INR)',
  'Payment Method',
  'Payment Status',
  'Payment Ref / UTR',
  'Attendance Status',
  'Last Updated'
];

/**
 * Handle incoming POST requests from the EVITRON 2K26 app server
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 30 seconds for other concurrent requests to release lock
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: 'Server busy, could not acquire lock.' })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'error', message: 'No payload data provided.' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // If sheet doesn't exist, create it
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // Initialize headers if row 1 is blank
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground('#B22222'); // EVITRON Crimson theme
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      headerRange.setFontFamily('Arial');
      sheet.setFrozenRows(1);
    }

    const regId = String(data.regId || '').trim();
    if (!regId) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'error', message: 'Missing regId in payload.' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Format human-readable track name
    let trackLabel = data.track === 'workshop' ? 'Workshop (Individual)' : 'Technical Symposium (Team of 3)';

    // Row values mapped exactly to headers
    const rowValues = [
      regId,
      data.createdAt ? new Date(data.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      trackLabel,
      data.events || '',
      data.leaderName || '',
      data.leaderEmail || '',
      data.leaderPhone ? String(data.leaderPhone) : '',
      data.college || '',
      data.department || '',
      data.year || '',
      data.participantsCount || 1,
      data.member2 || 'N/A',
      data.member3 || 'N/A',
      data.amount || 0,
      String(data.paymentMethod || '').toUpperCase(),
      String(data.paymentStatus || '').toUpperCase(),
      data.paymentRef || '',
      data.attendance || 'Absent',
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    ];

    // Check if Registration ID already exists in Column A to avoid duplicate entries
    const lastRow = sheet.getLastRow();
    let existingRowIndex = -1;

    if (lastRow > 1) {
      const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < idColumnValues.length; i++) {
        if (String(idColumnValues[i][0]).trim() === regId) {
          existingRowIndex = i + 2; // Offset for 1-based index and header row
          break;
        }
      }
    }

    if (existingRowIndex > 0) {
      // Update existing record in place
      sheet.getRange(existingRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      // Append as new record
      sheet.appendRow(rowValues);
      const newRowIdx = sheet.getLastRow();
      
      // Alternate row background shading for legibility
      if (newRowIdx % 2 === 0) {
        sheet.getRange(newRowIdx, 1, 1, rowValues.length).setBackground('#FAFAFA');
      }
    }

    // Auto-adjust column widths for readability on initial records
    if (sheet.getLastRow() <= 20) {
      for (let c = 1; c <= HEADERS.length; c++) {
        sheet.autoResizeColumn(c);
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'success',
        regId: regId,
        action: existingRowIndex > 0 ? 'updated' : 'inserted',
        row: existingRowIndex > 0 ? existingRowIndex : sheet.getLastRow()
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle GET requests for simple health-check verification
 */
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: 'active',
      service: 'EVITRON 2K26 Google Sheets Registration Webhook',
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}
