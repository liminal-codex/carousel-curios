/**
 * Carousel Curios: automatic, permanent item IDs.
 *
 * When a Title is typed into a row on the Inventory tab and that row has no ID,
 * the next free ID (e.g. CC-0009) is written into column A as a plain value.
 * Because it is a value, not a formula, it never changes when rows are sorted,
 * moved or deleted.
 *
 * Install: in the sheet, Extensions > Apps Script, paste this file, Save.
 * No authorization is needed for the automatic part.
 */

const INVENTORY = 'Inventory';
const ID_COL = 1;     // A
const TITLE_COL = 3;  // C

function onEdit(e) {
  const range = e && e.range;
  if (!range || range.getSheet().getName() !== INVENTORY) return;
  const first = Math.max(range.getRow(), 2);
  const last = range.getLastRow();
  if (last < 2 || range.getLastColumn() < TITLE_COL || range.getColumn() > TITLE_COL) return;
  fillIds_(range.getSheet(), first, last);
}

/** Menu action: give an ID to every titled row that is missing one. */
function fillMissingIds() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(INVENTORY);
  fillIds_(sheet, 2, sheet.getLastRow());
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Carousel Curios')
    .addItem('Fill missing IDs', 'fillMissingIds')
    .addToUi();
}

function fillIds_(sheet, first, last) {
  if (last < first) return;
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const prefix = String(SpreadsheetApp.getActive().getSheetByName('Settings').getRange('B2').getValue() || 'CC-');
    const allIds = sheet.getRange(2, ID_COL, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
    let next = allIds.reduce((max, id) => {
      const n = String(id).startsWith(prefix) ? parseInt(String(id).slice(prefix.length), 10) : NaN;
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);

    const rows = sheet.getRange(first, 1, last - first + 1, TITLE_COL).getValues();
    rows.forEach((row, i) => {
      if (row[ID_COL - 1] === '' && String(row[TITLE_COL - 1]).trim() !== '') {
        next += 1;
        sheet.getRange(first + i, ID_COL).setValue(prefix + String(next).padStart(4, '0'));
      }
    });
  } finally {
    lock.releaseLock();
  }
}
