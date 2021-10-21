/*
 * Project: ZilPay-wallet
 * Author: Rinat(hiccaru)
 * -----
 * Modified By: the developer formerly known as Rinat(hiccaru) at <lich666black@gmail.com>
 * -----
 * Copyright (c) 2021 ZilPay
 */
import type { StreamResponse } from 'types/stream';
import type { ZIlPayCore } from './core';
import type { AppConnect } from 'types/app-connect';

export class ZilPayApps {
  readonly #core: ZIlPayCore;

  constructor(core: ZIlPayCore) {
    this.#core = core;
  }

  public showWalletData(domain: string, sendResponse: StreamResponse) {
    try {
      const has = this.#core.apps.isConnected(domain);
      let account = null;

      if (has) {
        account = {
          base16: this.#core.account.selectedAccount.base16,
          bech32: this.#core.account.selectedAccount.bech32
        }
      }

      sendResponse({
        resolve: {
          account,
          netwrok: this.#core.netwrok.selected,
          http: this.#core.netwrok.provider
        }
      });
    } catch (err) {
      sendResponse({
        reject: err.message
      });
    }
  }

  public async addApp(app: AppConnect, sendResponse: StreamResponse) {
    try {
      await this.#core.apps.add(app);

      sendResponse({
        resolve: this.#core.apps.connections
      });
    } catch (err) {
      sendResponse({
        reject: err.message
      });
    }
  }

  public async addConfirm(app: AppConnect, sendResponse: StreamResponse) {
    try {
      await this.#core.apps.addConfirm(app);

      /// TODO: open popup.
      sendResponse({
        resolve: app
      });
    } catch (err) {
      sendResponse({
        reject: err.message
      });
    }
  }

  public requestConnections(sendResponse: StreamResponse) {
    try {
      sendResponse({
        resolve: this.#core.apps.connections
      });
    } catch (err) {
      sendResponse({
        reject: err.message
      });
    }
  }

  public async removeApp(index: number, sendResponse: StreamResponse) {
    try {
      await this.#core.apps.rm(index);

      sendResponse({
        resolve: this.#core.apps.connections
      });
    } catch (err) {
      sendResponse({
        reject: err.message
      });
    }
  }

  public async clearApps(sendResponse: StreamResponse) {
    try {
      await this.#core.apps.reset();

      sendResponse({
        resolve: this.#core.apps.connections
      });
    } catch (err) {
      sendResponse({
        reject: err.message
      });
    }
  }
}
