/**
 * CSV upload adapter.
 * Parses uploaded CSV files containing application or domain data.
 */

export interface CsvRow {
  [key: string]: string;
}

export async function parseCsvUpload(
  _fileContent: string
): Promise<CsvRow[]> {
  // TODO: implement CSV parsing
  return [];
}
