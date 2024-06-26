<script lang="ts">
	import Big from 'big.js';
  import { createEventDispatcher } from 'svelte';

	import Arrow from './icons/Arrow.svelte';

  import currencyStore from 'popup/store/currency';

	import { formatNumber } from 'popup/filters/n-format';
	import { uuidv4 } from 'lib/crypto/uuid';


	Big.PE = 99;
  const dispatch = createEventDispatcher();
	const uuid = uuidv4();

	export let percents = [0, 10, 30, 50, 70, 100];
	export let disabled = false;
  export let loading = false;
	export let converted = null;
	export let placeholder = '';
	export let max = '0';
  export let img;
  export let symbol;
	export let value;

	const onClick = () => {
    dispatch('select');
  };
	const onInput = (e) => {
		if (isNaN(Number(value))) {
			return;
		}

		dispatch('input', String(value));
  };
	const onPercentInput = (n: number) => {
		try {
			const _100 = Big(100);
			const _n = Big(n);
			const _max = Big(max);
			const _value = _max.mul(_n).div(_100);

			dispatch('input', String(_value));
		} catch (err) {
			console.log(err);
		}
	};
</script>

<label
	class:loading={loading}
	for={uuid}
>
  <span on:click={onClick}>
    <img
      src={img}
      alt="input-token"
    />
    <h3>
      {symbol}
    </h3>
  </span>
  <div class="column">
    <input
			bind:value={value}
			id={uuid}
			placeholder={placeholder}
			disabled={loading || disabled}
			on:input={onInput}
		/>
    <div>
			{#if converted}
				<b>{formatNumber(converted, $currencyStore)}</b>
			{/if}
      {#each percents as percent}
        <p on:click={() => onPercentInput(percent)}>{percent}%</p>
      {/each}
    </div>
  </div>
</label>

<style lang="scss">
  @import "../styles/mixins";

	label {
		display: flex;
		align-items: center;

		box-shadow: rgb(50 50 93 / 25%) 0px 2px 5px -1px, rgb(0 0 0 / 30%) 0px 1px 3px -1px;
		background-color: var(--card-color);
		border: solid 1px var(--card-color);
		width: 100%;
		
		@include border-radius(8px);

		&.loading {
			border: solid 1px transparent;
      @include loading-gradient(var(--background-color), var(--card-color));

			& > span {
				cursor: inherit;
			}
    }

		& > span {
			cursor: pointer;
			padding-left: 8px;
			padding-right: 8px;
			height: 80%;
			min-width: 80px;
			border-right: 1px solid var(--muted-color);

			@include flex-between-row;

			& > img {
				height: 25px;
				width: 25px;
			}
			& > h3 {
				font-size: 10px;
				padding-left: 2px;
				padding-right: 2px;
			}
		}
		& > div.column {
			padding: 5px;
			width: 100%;

			& > input {
				width: 100%;
				height: auto;
				font-size: 14px;
				padding: 0;
				border-color: var(--card-color);

				&:disabled {
					cursor: inherit;
					background: transparent;
					border-color: transparent;
				}
			}
			& > div {
				display: flex;
				justify-content: flex-end;
				align-items: center;
				min-height: 27px;

				& > b {
					width: 100%;
					text-indent: 5px;
				}

				& > p {
					cursor: pointer;
					margin: 0;
					margin: 5px;
					font-size: 12px;

					&:hover {
						color: var(--text-color);
					}
				}
			}
		}

		&:focus-within {
			border: solid 1px var(--text-color);
		}
	}
</style>
