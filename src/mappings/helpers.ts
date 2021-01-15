import { OptionFactory, Option, Token, Market } from '../../generated/schema';
import { Option as OptionContract } from '../../generated/OptionFactory/Option';
import { Option as OptionTemplate } from '../../generated/templates';
import { ERC20 } from '../../generated/OptionFactory/ERC20';
import { Address, BigInt, BigDecimal } from '@graphprotocol/graph-ts';
import { ZERO_BIGDECIMAL, ZERO_BIGINT } from './constants';

export function getFactory(): OptionFactory {
  const factoryAddr = '0xa4accc3dff7bd0d07fa02e39cd12e1a62d15f90f'; // TODO: take this dynamically
  let factory = OptionFactory.load(factoryAddr);
  if (factory === null) {
    factory = new OptionFactory(factoryAddr);
    factory.optionCount = 0;
    factory.marketCount = 0;
    factory.txCount = BigInt.fromI32(0);
    factory.save();
  }
  return factory as OptionFactory;
}

export function getOption(optionAddr: Address): Option {
  let option = Option.load(optionAddr.toHexString());
  if (option === null) {
    option = new Option(optionAddr.toHexString());

    option.expiry = 0;
    option.strikeLocked = ZERO_BIGDECIMAL; // BigDecimal!;
    option.underlyingLocked = ZERO_BIGDECIMAL; // BigDecimal!;
    option.strikeVolume = ZERO_BIGDECIMAL; // BigDecimal!;
    option.underlyingVolume = ZERO_BIGDECIMAL; // BigDecimal!;

    let optionContract = OptionContract.bind(optionAddr);

    // registering underlying token
    let underlyingTokenAddrResult = optionContract.try_getUnderlyingTokenAddress();
    if (!underlyingTokenAddrResult.reverted) {
      option.underlyingToken = getToken(underlyingTokenAddrResult.value).id;
    }

    // registering strike token
    let strikeTokenAddrResult = optionContract.try_getStrikeTokenAddress();
    if (!strikeTokenAddrResult.reverted) {
      option.strikeToken = getToken(strikeTokenAddrResult.value).id;
    }

    // registering option token
    {
      let token = getToken(optionAddr);
      token.kind = 'OPTION';
      token.save();
    }

    // registering redeem token
    let redeemTokenAddrResult = optionContract.try_redeemToken();
    if (!redeemTokenAddrResult.reverted) {
      let token = getToken(redeemTokenAddrResult.value);
      option.shortToken = token.id;
      token.kind = 'REDEEM';
      token.save();
    }

    // creating market entry
    let market = getMarket(option.underlyingToken + '-' + option.strikeToken);
    option.market = market.id;

    // this would revert and stop indexer if underlyingToken and strikeToken are not set.
    option.save();

    // adding contract address to indexer
    OptionTemplate.create(Address.fromString(option.id));
  }
  return option as Option;
}

export function getToken(tokenAddr: Address): Token {
  let token = Token.load(tokenAddr.toHexString());
  if (token === null) {
    token = new Token(tokenAddr.toHexString());
    token.symbol = 'unknown';
    token.name = 'unknown';
    token.decimals = BigInt.fromI32(0);
    token.kind = 'OTHER'; // this is later changed to appropriate value
    let contract = ERC20.bind(tokenAddr);
    {
      let symbolCallResult = contract.try_symbol();
      if (!symbolCallResult.reverted) {
        token.symbol = symbolCallResult.value;
      }
    }
    {
      let nameResult = contract.try_name();
      if (!nameResult.reverted) {
        token.name = nameResult.value;
      }
    }
    {
      let decimalResult = contract.try_decimals();
      if (!decimalResult.reverted) {
        token.decimals = BigInt.fromI32(decimalResult.value);
      }
    }
    token.save();
  }
  return token as Token;
}

export function getMarket(id: string): Market {
  // let id = option.underlyingToken + '-' + option.strikeToken;
  let market = Market.load(id);
  if (market === null) {
    market = new Market(id);
    // market.options = [option.id]; // [Option!]!;
    market.totalStrikeLocked = ZERO_BIGDECIMAL; // BigDecimal!;
    market.totalUnderlyingLocked = ZERO_BIGDECIMAL; // BigDecimal!;
    market.strikeTotalVolume = ZERO_BIGDECIMAL; // BigDecimal!;
    market.underlyingTotalVolume = ZERO_BIGDECIMAL; // BigDecimal!;
    market.txCount = ZERO_BIGINT; // BigInt!;
    market.save();
  }
  return market as Market;
}

export function convertBigIntToBigDecimal(
  bigInt: BigInt,
  decimals: BigInt
): BigDecimal {
  // preventing div by zero
  if (decimals === ZERO_BIGINT) {
    return bigInt.toBigDecimal();
  }
  // creating 10^decimals
  let denominator = BigDecimal.fromString('1');
  for (
    let i = ZERO_BIGINT;
    i.lt(decimals as BigInt);
    i = i.plus(BigInt.fromI32(1))
  ) {
    denominator = denominator.times(BigDecimal.fromString('10'));
  }
  return bigInt.toBigDecimal().div(denominator);
}

export function bigDecimalizeToken(
  bigInt: BigInt,
  addressStr: string
): BigDecimal {
  return convertBigIntToBigDecimal(
    bigInt,
    getToken(Address.fromString(addressStr)).decimals
  );
}