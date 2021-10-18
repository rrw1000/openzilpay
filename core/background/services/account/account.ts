/*
 * Project: ZilPay-wallet
 * Author: Rinat(hiccaru)
 * -----
 * Modified By: the developer formerly known as Rinat(hiccaru) at <lich666black@gmail.com>
 * -----
 * Copyright (c) 2021 ZilPay
 */
import type { ZilliqaControl } from 'core/background/services/blockchain';
import type { ZRC2Controller } from 'core/background/services/token';
import type { Account, KeyPair, Wallet } from 'types/account';
import type { AuthGuard } from 'core/background/services/guard';
import type { ZRC2Token } from 'types/token';
import { Buffer } from 'buffer';
import assert from 'assert';
import { HDKey } from './hd-key';
import { MnemonicController } from './mnemonic';
import secp256k1 from 'secp256k1/elliptic';
import { getAddressFromPublicKey, toChecksumAddress } from 'lib/utils/address';
import { toBech32Address } from 'lib/utils/bech32';
import { getPubKeyFromPrivateKey } from 'lib/utils/address';
import { BrowserStorage, buildObject } from 'lib/storage';
import { Fields } from 'config/fields';
import { AccountTypes } from 'config/account-type';
import { Contracts } from 'config/contracts';
import { ErrorMessages } from 'config/errors';

export class AccountController {
  public static readonly field0 = 'identities';
  public static readonly field1 = 'selectedAddress';

  private readonly _hdKey = new HDKey();
  private readonly _mnemonic = new MnemonicController();
  private readonly _zilliqa: ZilliqaControl;
  private readonly _guard: AuthGuard;
  private _zrc2: ZRC2Controller;
  private _wallet: Wallet = {
    selectedAddress: 0,
    identities: []
  };

  public get wallet() {
    return this._wallet;
  }

  public get selectedAccount(): undefined | Account {
    if (this.wallet.identities.length === 0) {
      return null;
    }
    if (!this.wallet.identities[this.wallet.selectedAddress]) {
      return null;
    }
    return this.wallet.identities[this.wallet.selectedAddress];
  }

  public get lastIndexPrivKey() {
    return this._wallet
      .identities
      .filter((acc) => acc.type === AccountTypes.PrivateKey)
      .length;
  }

  public get lastIndexSeed() {
    return this._wallet
      .identities
      .filter((acc) => acc.type === AccountTypes.Seed)
      .length;
  }

  public get lastIndexLedger() {
    return this._wallet
      .identities
      .filter((acc) => acc.type === AccountTypes.Ledger)
      .length;
  }

  constructor(zilliqa: ZilliqaControl, guard: AuthGuard) {
    this._zilliqa = zilliqa;
    this._guard = guard;
  }

  public initZRC(rc2Controller: ZRC2Controller) {
    this._zrc2 = rc2Controller;
  }

  public async remove(index: number) {
    assert(index > 1, ErrorMessages.OutOfIndex);

    delete this._wallet.identities[index];

    this._wallet.identities = this._wallet.identities.filter(Boolean);

    if (this.wallet.selectedAddress === index) {
      this.wallet.selectedAddress -= 1;
    }

    await BrowserStorage.set(
      buildObject(Fields.WALLET, this._wallet)
    );
  }

  public async fromSeed(words: string, index = 0): Promise<KeyPair> {
    const path = this._mnemonic.getKey(index);
    const seed = await this._mnemonic.mnemonicToSeed(words);
    const hdKey = this._hdKey.fromMasterSeed(seed);
    const childKey = hdKey.derive(path);

    return childKey.keyPair;
  }

  public fromPrivateKey(privateKey: string): KeyPair {
    const bytes = Buffer.from(privateKey, 'hex');

    assert.equal(bytes.length, 32, 'Private key must be 32 bytes.');
    assert(secp256k1.privateKeyVerify(bytes), 'Invalid private key');

    const pubKey = getPubKeyFromPrivateKey(privateKey);
    const base16 = getAddressFromPublicKey(pubKey);

    return {
      pubKey,
      base16,
      privKey: privateKey
    };
  }

  public async addToken(token: ZRC2Token, balance: string) {
    this.wallet.identities = this.wallet.identities.map((acc) => ({
      ...acc,
      zrc2: {
        ...acc.zrc2,
        [token.base16]: balance
      }
    }));

    await BrowserStorage.set(
      buildObject(Fields.WALLET, this._wallet)
    );
  }

  public async getKeyPair(): Promise<KeyPair> {
    switch (this.selectedAccount.type) {
      case AccountTypes.Seed:
        const seed = this._guard.getSeed();
        const index = this.selectedAccount.index;
        const keyPair = await this.fromSeed(seed, index);
        return keyPair;
      case AccountTypes.PrivateKey:
        const encryptedPriveLey = this.selectedAccount.privKey;
        const privateKey = this._guard.decryptPrivateKey(encryptedPriveLey);
        return {
          pubKey: this.selectedAccount.pubKey,
          privKey: privateKey,
          base16: this.selectedAccount.base16
        };
        break;
      case AccountTypes.Ledger:
        throw new Error(ErrorMessages.CannotExportLedger);
    }
  }

  public async removeToken(token: ZRC2Token) {
    for (let index = 0; index < this.wallet.identities.length; index++) {
      delete this.wallet.identities[index].zrc2[token.base16];
    }

    await BrowserStorage.set(
      buildObject(Fields.WALLET, this._wallet)
    );
  }

  public async migrate() {
    const newWallet = await BrowserStorage.get(Fields.WALLET);
    if (newWallet) return null;
    let oldWallet = await BrowserStorage.get(Fields.OLD_WALLET);
    if (!oldWallet) return null;
    try {
      oldWallet = JSON.parse(String(oldWallet));
    } catch {
      //
    }
    const identities = oldWallet[AccountController.field0];
    const selectedAddress = oldWallet[AccountController.field1];
    const newIdentities: Account[] = [];
    const vault = this._guard.getWallet();

    for (let i = 0; i < identities.length; i++) {
      const { address, balance, isImport, index, hwType, name, pubKey } = identities[i];
      const newAccount: Account = {
        index,
        pubKey,
        name: name || `Account ${index}`,
        type: AccountTypes.Seed,
        base16: toChecksumAddress(address),
        bech32: toBech32Address(address),
        zrc2: {
          [Contracts.ZERO_ADDRESS]: balance
        },
        nft: {}
      };

      if (hwType === 'ledger') {
        newAccount.type = AccountTypes.Ledger;
        newAccount.name = `Ledger ${index}`;
      } else if (isImport) {
        const { privateKey } = vault.decryptImported.find(
          (el) => el.index === index
        );
        newAccount.privKey = this._guard.encryptPrivateKey(privateKey);
        newAccount.type = AccountTypes.PrivateKey;
        newAccount.name = `Imported ${index}`;
        newAccount.pubKey = getPubKeyFromPrivateKey(privateKey);
      } else {
        const { pubKey } = await this.fromSeed(vault.decryptSeed, index);

        newAccount.pubKey = pubKey;
      }

      newIdentities.push(newAccount);
    }

    this._wallet.selectedAddress = selectedAddress;
    this._wallet.identities = newIdentities;

    await BrowserStorage.set(
      buildObject(Fields.WALLET, this._wallet)
    );
  }

  public async sync() {
    const walletJson = await BrowserStorage.get(Fields.WALLET);

    try {
      const wallet = JSON.parse(String(walletJson));

      this._wallet = wallet;
    } catch {
      //
    }
  }

  public async addAccountFromSeed(seed: string, name: string) {
    const index = this.lastIndexSeed;
    const { pubKey, base16 } = await this.fromSeed(seed, index);
    const bech32 = toBech32Address(base16);
    const type = AccountTypes.Seed;
    const zrc2 = await this._zrc2.getBalance(base16);
    const account: Account = {
      name,
      bech32,
      index,
      base16,
      type,
      pubKey,
      zrc2,
      nft: {}
    };
    await this._add(account);
    return account;
  }

  public async balanceUpdate() {
    const zrc2 = await this._zrc2.getBalance(this.selectedAccount.base16);
    this._wallet.identities[this._wallet.selectedAddress].zrc2 = zrc2;

    await BrowserStorage.set(
      buildObject(Fields.WALLET, this._wallet)
    );

    return this.wallet;
  }

  public async addAccountFromPrivateKey(privKey: string, name: string) {
    const index = this.lastIndexPrivKey;
    const { pubKey, base16 } = this.fromPrivateKey(privKey);
    const bech32 = toBech32Address(base16);
    const type = AccountTypes.PrivateKey;
    const encryptedPrivateKey = this._guard.encryptPrivateKey(privKey);
    const zrc2 = await this._zrc2.getBalance(base16);
    const account: Account = {
      name,
      bech32,
      index,
      base16,
      type,
      pubKey,
      privKey: encryptedPrivateKey,
      zrc2,
      nft: {}
    };
    await this._add(account);
    return account;
  }

  public async select(index: number) {
    assert(index < this.wallet.identities.length, ErrorMessages.OutOfIndex);

    this._wallet.selectedAddress = index;

    await BrowserStorage.set(
      buildObject(Fields.WALLET, this._wallet)
    );

    return this.selectedAccount;
  }

  public async changeAccountName(name: string) {
    this._wallet.identities[this._wallet.selectedAddress].name = name;

    await BrowserStorage.set(
      buildObject(Fields.WALLET, this._wallet)
    );

    return this.selectedAccount;
  }

  private async _add(account: Account) {
    await this._checkAccount(account);

    this._wallet
      .identities
      .push(account);
    this._wallet
      .selectedAddress = this.wallet.identities.length - 1;

    await BrowserStorage.set(
      buildObject(Fields.WALLET, this._wallet)
    );

    return this.wallet;
  }

  private async _checkAccount(account: Account) {
    await this.sync();

    const isUnique = this.wallet.identities.some(
      (acc) => (acc.base16 === account.base16)
    );
    const isIndex = this.wallet.identities.some(
      (acc) => (acc.index === account.index) && (acc.type === account.type)
    );

    assert(!isUnique, 'Account must be unique');
    assert(!isIndex, 'Incorect index and account type');
  }
}
