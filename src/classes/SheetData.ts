import ALPHABET from '../constants/alphabet';
import SheetRange from '../types/sheetRange';
import dataArrayToObjects from '../utils/dataArrayToObjects';

class SheetData {
  private sheetObject;
  constructor(sheetObject: GoogleAppsScript.Spreadsheet.Sheet) {
    this.sheetObject = sheetObject;
  }

  /**
   * Returns array with data range coordinates, setting the last row based on the first column
   */
  public getRange = (startRow = 1, startColumn = 1, endColumn?: number) => {
    const sheetLastRow = this.getLastRow(startColumn);
    const sheetLastColumn = this.sheetObject.getLastColumn();

    const finalRow = sheetLastRow;
    const finalColumn = endColumn ? endColumn : sheetLastColumn;

    const finalRange = [
      startRow,
      startColumn,
      finalRow,
      finalColumn,
    ] as SheetRange;

    return {
      getArray: () => finalRange,
      getValues: () => this.getValues(finalRange),
      getDataInObjects: <SheetItemType extends object>() =>
        this.getDataInObjects<SheetItemType>(finalRange),
    };
  };

  /**
   * Returns sheet data in array of objects with first row values as properties 
   * @example 
   * from
   * 
   * [ [ 'target_id', 'run', 'target_name', 'target_last_row', 'clean' ],
   *   [ 985805479, 1, 'orders', 11, 18 ] ]
   * 
   * to
   * 
   * [ { target_id: 985805479,
         run: 1,
        target_name: 'orders',
        target_last_row: 11,
        clean: 18 } ]
   */
  private getDataInObjects = <SheetItemType extends object>(
    dataArrange: SheetRange
  ) => {
    const sheetValues = this.getValues(dataArrange);

    const objectsArray = dataArrayToObjects<SheetItemType>(sheetValues);

    const finalArray = objectsArray.filter((item) => {
      if (!('include' in item)) return true;
      return item.include === 1;
    });

    return finalArray;
  };

  /**
   * Return sheet data in array of arrays, excluding empty rows based on the first column rows count
   * @example
   * from
   * [
   *  ['target_id', 'run', 'target_name'],
   *  [ 1600250825, 0, 'test'],
   *  ['','','','']
   * ]
   *
   * to
   *
   * [
   *  ['target_id', 'run', 'target_name'],
   *  [ 1600250825, 0, 'test']
   * ]
   */
  private getValues = (dataArrange: SheetRange) => {
    const sheetValues = this.sheetObject.getRange(...dataArrange).getValues();

    return sheetValues;
  };

  /**
   * Returns last row of a given column.
   *
   * If number of blank spaces exceeds the limit, it'll throw error
   */
  public getLastRow = (columnNumber = 1) => {
    const columnName = ALPHABET[columnNumber - 1];
    const rangeInString = `${columnName}1:${columnName}`; // getRange(A1:A)

    const sheetColumn = this.sheetObject.getRange(rangeInString);

    let directionDownRange = sheetColumn.getNextDataCell(
      SpreadsheetApp.Direction.DOWN
    );
    let lastRowFound = false;
    let lastRow = 0;
    const lastRowHistory: number[] = [directionDownRange.getRow()];
    const directionDownLimit = 10;

    for (let index = 0; !lastRowFound; index++) {
      if (index === directionDownLimit)
        throw new Error(
          `There are more than ${directionDownLimit} blank spaces between rows ` +
            `in "${this.sheetObject.getSheetName()}", column number ${columnNumber}`
        );

      // re assigns object ref to next direction down "jump"
      directionDownRange = directionDownRange.getNextDataCell(
        SpreadsheetApp.Direction.DOWN
      );

      const endOfColumnReached =
        directionDownRange.getRow() === lastRowHistory[0];

      if (endOfColumnReached) {
        lastRowFound = true;
        lastRow = lastRowHistory[1];
      }

      lastRowHistory.unshift(directionDownRange.getRow());
      // console.log('log', index, lastRowHistory, directionDownRange.getRow());
    }

    return lastRow;
  };
}

export default SheetData;
