import { Transfer } from '../../generated/templates/ERC20Token/ERC20';
import { updateTokenBalance } from './helpers';

// ERC20Template is only created for every Option, Redeem, Uniswap Pair contract
// Underlying and Strike tokens are not recorded since it would add noice to the subgraph
export function handleEvent_ERC20Transfer(event: Transfer): void {
  updateTokenBalance(event.address, event.params.from);
  updateTokenBalance(event.address, event.params.to);
}
