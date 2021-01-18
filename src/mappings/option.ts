import { Market, Option, Transaction } from '../../generated/schema';
import {
  UpdatedCacheBalances,
  Mint,
} from '../../generated/OptionFactory/Option';
import { bigDecimalizeToken, recordTransaction } from './helpers';

/**
 * This method is called by the indexer whenever it finds the event
 * @param event contains event params and other info like tx, block
 */
export function handleEvent_UpdatedCacheBalances(
  event: UpdatedCacheBalances
): void {
  let option = Option.load(event.address.toHexString());
  let market = Market.load(option.market);
  let underlyingLockedOld = option.underlyingLocked;
  let strikeLockedOld = option.strikeLocked;

  let underlyingLockedNew = bigDecimalizeToken(
    event.params.underlyingCache,
    option.underlyingToken
  );
  let strikeCacheNew = bigDecimalizeToken(
    event.params.strikeCache,
    option.strikeToken
  );

  option.underlyingLocked = underlyingLockedNew;
  option.strikeLocked = strikeCacheNew;
  option.save();

  market.totalUnderlyingLocked = market.totalUnderlyingLocked
    .minus(underlyingLockedOld)
    .plus(underlyingLockedNew);
  market.totalStrikeLocked = market.totalStrikeLocked
    .minus(strikeLockedOld)
    .plus(strikeCacheNew);
  market.save();
}

/**
 * This method is called by the indexer whenever it finds the event
 * @param event contains event params and other info like tx, block
 */
export function handleEvent_Mint(event: Mint): void {
  let option = Option.load(event.address.toHexString());
  recordTransaction(
    event.transaction.hash.toHexString(),
    event.block.number,
    event.block.timestamp,
    option.factory,
    option.market,
    event.address.toHexString(),
    'MINT'
  );
}
