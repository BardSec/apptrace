/**
 * Ingestion pipeline.
 * Coordinates data source adapters to import application discovery data.
 */

export interface IngestionResult {
  source: string;
  recordsProcessed: number;
  newAppsDiscovered: number;
  errors: string[];
}

export async function runIngestion(
  _source: string
): Promise<IngestionResult> {
  // TODO: implement adapter dispatch
  return {
    source: _source,
    recordsProcessed: 0,
    newAppsDiscovered: 0,
    errors: [],
  };
}
