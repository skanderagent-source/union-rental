import { isValidListingId } from '@union-rental/shared';
import { supabaseAdmin } from '../../db/supabaseAdmin.js';
import { throwIfDatabaseError } from '../../utils/databaseError.js';

export type PublicListingStatus = 'available' | 'gone' | 'not_found';

export async function getPublicListingStatus(listingId: string): Promise<PublicListingStatus> {
  if (!isValidListingId(listingId)) return 'not_found';

  const { data: available, error: availableError } = await supabaseAdmin
    .from('public_available_listings')
    .select('id')
    .eq('id', listingId)
    .maybeSingle();
  throwIfDatabaseError(availableError);
  if (available) return 'available';

  const { data: row, error: rowError } = await supabaseAdmin
    .from('logements')
    .select('id, deleted_at, statut')
    .eq('id', listingId)
    .maybeSingle();
  throwIfDatabaseError(rowError);
  if (!row) return 'not_found';
  if (row.deleted_at || row.statut !== 'Available') return 'gone';
  return 'gone';
}

export function listingStatusHttpCode(status: PublicListingStatus): number {
  if (status === 'available') return 200;
  if (status === 'gone') return 410;
  return 404;
}
