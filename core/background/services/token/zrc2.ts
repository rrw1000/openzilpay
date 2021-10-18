/*
 * Project: ZilPay-wallet
 * Author: Rinat(hiccaru)
 * -----
 * Modified By: the developer formerly known as Rinat(hiccaru) at <lich666black@gmail.com>
 * -----
 * Copyright (c) 2021 ZilPay
 */
import type { ZRC2Token, InitItem, ZRC2Info } from 'types/token';
import type { ZilliqaControl } from 'core/background/services/blockchain';
import type { NetworkControl } from 'core/background/services/network';
import type { AccountController } from 'core/background/services/account/account';
import assert from 'assert';
import { Contracts } from 'config/contracts';
import { BrowserStorage, buildObject } from 'lib/storage';
import { Fields } from 'config/fields';
import { TypeOf } from 'lib/type/type-checker';
import { NETWORK } from 'config/network';
import { ErrorMessages } from 'config/errors';
import { toBech32Address } from 'lib/utils/bech32';
import { tohexString } from 'lib/utils/address';

enum InitFields {
  ContractOwner = 'contract_owner',
  Name = 'name',
  Symbol = 'symbol',
  Decimals = 'decimals',
  Address = '_this_address'
}

enum ZRC2Fields {
  Balances = 'balances'
}

const [mainnet, testnet, custom] = Object.keys(NETWORK);

export const ZIL = {
  base16: Contracts.ZERO_ADDRESS,
  bech32: 'zil1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9yf6pz',
  decimals: 12,
  name: 'Zilliqa',
  symbol: 'ZIL'
};
export const ZLP = {
  base16: Contracts.ZIlPay,
  bech32: 'zil1l0g8u6f9g0fsvjuu74ctyla2hltefrdyt7k5f4',
  decimals: 18,
  name: 'ZilPay wallet',
  symbol: 'ZLP'
};
const INIT = {
  [mainnet]: [ZIL, ZLP],
  [testnet]: [ZIL],
  [custom]: [ZIL]
};

export class ZRC2Controller {
  private readonly _netwrok: NetworkControl;
  private readonly _zilliqa: ZilliqaControl;
  private readonly _account: AccountController;
  private _identities: ZRC2Token[] = [];

  public get identities() {
    return this._identities;
  }

  public get field() {
    return `${Fields.TOKENS}/${this._netwrok.selected}`;
  }

  constructor(
    netwrok: NetworkControl,
    zilliqa: ZilliqaControl,
    account: AccountController
  ) {
    this._netwrok = netwrok;
    this._zilliqa = zilliqa;
    this._account = account;
    this._account.initZRC(this);
  }

  public async remove(index: number) {
    assert(index > 2, ErrorMessages.OutOfIndex);

    await this._account.removeToken(this._identities[index]);

    delete this._identities[index];

    await BrowserStorage.set(
      buildObject(this.field, this.identities)
    );
  }

  public async add(token: ZRC2Info) {
    const newToken: ZRC2Token = {
      decimals: token.decimals,
      name: token.name,
      symbol: token.symbol,
      base16: token.base16,
      bech32: token.bech32
    };
    this._isUnique(newToken);
    this._identities.push(newToken);

    await this._account.addToken(newToken, token.balance);
    await BrowserStorage.set(
      buildObject(this.field, this.identities)
    );
  }

  public async getToken(address: string): Promise<ZRC2Info> {
    let balance = '0';
    const init = await this._zilliqa.getSmartContractInit(address);
    const zrc = this._toZRC2(init);
    const bech32 = toBech32Address(address);

    if (this._account.selectedAccount) {
      const userAddress = this._account.selectedAccount.base16.toLowerCase();
      balance = await this._zilliqa.getSmartContractSubState(
        address,
        ZRC2Fields.Balances,
        [userAddress]
      );

      if (!balance) {
        balance = '0';
      }

      try {
        balance = balance[ZRC2Fields.Balances][userAddress];
      } catch {
        balance = '0';
      }
    }

    return {
      balance,
      bech32,
      name: zrc.name,
      symbol: zrc.symbol,
      decimals: zrc.decimals,
      base16: address
    };
  }

  public async getBalance(owner: string) {
    let balance = {};
    for (let index = 0; index < this.identities.length; index++) {
      const token = this.identities[index];
      try {
        if (token.base16 === Contracts.ZERO_ADDRESS) {
          const bal = await this._zilliqa.getBalance(owner);
          balance[token.base16] = bal.balance;
          continue;
        }

        const addr = String(owner).toLowerCase();
        const bal = await this._zilliqa.getSmartContractSubState(
          tohexString(token.base16),
          ZRC2Fields.Balances,
          [addr]
        );
        if (!bal) {
          balance[token.base16] = '0';
        } else {
          balance[token.base16] = bal[ZRC2Fields.Balances][addr];
        }
      } catch {
        continue;
      }
    }

    return balance;
  }

  public async sync() {
    const jsonList = await BrowserStorage.get(this.field);

    try {
      const list = JSON.parse(String(jsonList));

      if (!list || !TypeOf.isArray(list)) {
        return this.reset();
      }

      this._identities = list;
    } catch {
      await this.reset();
    }
  }

  public async reset() {
    const init = INIT[this._netwrok.selected];
    this._identities = init;
    await BrowserStorage.set(
      buildObject(this.field, this.identities)
    );
  }

  private _isUnique(token: ZRC2Token) {
    for (let index = 0; index < this._identities.length; index++) {
      const element = this._identities[index];
      assert(element.base16 !== token.base16, ErrorMessages.MustBeUnique);
      assert(element.bech32 !== token.bech32, ErrorMessages.MustBeUnique);
      assert(element.name !== token.name, ErrorMessages.MustBeUnique);
    }
  }

  private _toZRC2(init: InitItem[]) {
    const contractOwner = init.find((el) => el.vname === InitFields.ContractOwner)?.value;
    const name = init.find((el) => el.vname === InitFields.Name)?.value || '';
    const symbol = init.find((el) => el.vname === InitFields.Symbol)?.value;
    const address = init.find((el) => el.vname === InitFields.Address)?.value;
    const decimals = init.find((el) => el.vname === InitFields.Decimals)?.value;

    assert(Boolean(contractOwner), `${InitFields.ContractOwner} ${ErrorMessages.RequiredParam}`);
    assert(Boolean(name), `${InitFields.Name} ${ErrorMessages.RequiredParam}`);
    assert(Boolean(symbol), `${InitFields.Symbol} ${ErrorMessages.RequiredParam}`);
    assert(Boolean(address), `${InitFields.Address} ${ErrorMessages.RequiredParam}`);
    assert(Boolean(decimals), `${InitFields.Decimals} ${ErrorMessages.RequiredParam}`);

    return {
      decimals: Number(decimals),
      contractOwner,
      name,
      symbol,
      address
    };
  }
}
