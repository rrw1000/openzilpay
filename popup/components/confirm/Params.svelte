<script lang="ts">
	import { _ } from 'popup/i18n';
	import { fade } from "svelte/transition";

  import { trim } from 'popup/filters/trim';
	import { fromDecimals } from 'popup/filters/units';
  import { viewIcon } from 'lib/block-explorer/view';
  import { formatNumber } from 'popup/filters/n-format';
  import { viewAddress } from 'lib/block-explorer/view';

	import zrcStore from 'popup/store/zrc';
  import themeStore from 'popup/store/theme';
  import netStore from 'popup/store/netwrok';

	export let tx = {
    amount: 0,
    tokenAmount: 0,
    fee: 0,
    recipient: '',
    teg: '',
    token: $zrcStore[0],
    gasLimit: 0,
    gasPrice: 0
  };

	$: amount = fromDecimals(String(tx.tokenAmount || 0), Number(tx.token.decimals || 0)).round(7);
  $: img = viewIcon(tx.token.bech32, $themeStore);
</script>

<ul in:fade>
  <li>
    <span>
      {$_('confirm.params.amount')}
    </span>
    <span>
      <img
        src={img}
        width="15"
        alt="app"
      />
      {formatNumber(amount)} {tx.token.symbol} <span>
        + {tx.fee} ZIL
      </span>
    </span>
  </li>
  <li>
    <span>
      {$_('confirm.params.teg')}
    </span>
    <span>
      {tx.teg}
    </span>
  </li>
  <li>
    <span>
      {$_('confirm.params.fee')}
    </span>
    <span>
      {tx.fee} ZIL
    </span>
  </li>
  <li>
    <span>
      {$_('confirm.params.nonce')}
    </span>
    <span>
      {tx.nonce || 0}
    </span>
  </li>
  <li>
    <span>
      {$_('confirm.params.to')}
    </span>
    <span>
      <a
        href={viewAddress(tx.recipient, $netStore.selected)}
        target="_blank"
      >
        {trim(tx.recipient)}
      </a>
    </span>
  </li>
</ul>

<style lang="scss">
	@import "../../styles/mixins";
	ul {
		margin: 0;
    padding: 5px;

    width: calc(100vw - 15px);
    max-width: 500px;

		& > li {
			line-height: 20px;
			padding: 5px;
			font-family: Regular;
			border-bottom: solid 1px var(--border-color);
			color: var(--text-color);

			@include fluid-font(320px, 720px, 16px, 20px);
			@include flex-between-row;

			&:last-child {
				border-bottom: solid 1px transparent;
			}
			& > span:last-child {
				font-family: Demi;

        & > span {
          color: var(--muted-color);
        }
        & > a {
          color: inherit;
        }
			}
		}
	}
</style>
