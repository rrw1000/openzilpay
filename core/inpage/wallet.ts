/*
 * Project: ZilPay-wallet
 * Author: Rinat(hiccaru)
 * -----
 * Modified By: the developer formerly known as Rinat(hiccaru) at <lich666black@gmail.com>
 * -----
 * Copyright (c) 2021 ZilPay
 */

import type { TabStream } from "lib/streem/tab-stream";
import type { InpageWallet } from "types/account";
import type { Subject } from "./subject";
import type { TxBlock } from 'types/block';

import assert from 'assert';
import { uuidv4 } from 'lib/crypto/uuid';
import { Transaction } from "./transaction";
import { MTypeTab, MTypeTabContent } from "lib/streem/stream-keys";
import { TypeOf } from "lib/type/type-checker";
import { getFavicon } from "./favicon";
import { ContentMessage } from "lib/streem/secure-message";
import { CryptoUtils } from "./crypto";

export class Wallet {
  #stream: TabStream;
  #subject: Subject;

  #isConnect = false;
  #isEnable = false;
  #http: string | null;
  #net = 'mainnet';
  #defaultAccount: InpageWallet | null = null;

  public txns = new Set<string>();

  public get isConnect() {
    return this.#isConnect;
  }

  public get isEnable() {
    return this.#isEnable;
  }

  public get net() {
    return this.#net;
  }

  public get defaultAccount() {
    return this.#defaultAccount;
  }
  
  public get http() {
    return this.#http;
  }

  constructor(stream: TabStream, subject: Subject) {
    this.#stream = stream;
    this.#subject = subject;
    this.#subscribe();
  }

  public observableAccount() {
    assert(this.isEnable, 'ERROR_MSGS.DISABLED');
    assert(this.isConnect, 'ERROR_MSGS.CONNECT');

    return {
      subscribe: (cb: (account: InpageWallet) => void) => {
        const obs = this.#subject.on((msg) => {
          switch (msg.type) {
            case MTypeTab.ADDRESS_CHANGED:
              cb(msg.payload.account);
              break;
            case MTypeTab.GET_WALLET_DATA:
              cb(msg.payload.account);
              break;
            case MTypeTab.LOCK_STAUS:
              cb(msg.payload.account);
              break;
            case MTypeTab.RESPONSE_TO_DAPP:
              cb(msg.payload.account);
              break;
            default:
              break;
          }
        });

        return {
          unsubscribe: () => obs()
        };
      }
    };
  }

  /**
   * Observable for new block was created.
   */
  public observableBlock() {
    assert(this.isEnable, 'ERROR_MSGS.DISABLED');
    assert(this.isConnect, 'ERROR_MSGS.CONNECT');

    return {
      subscribe: (cb: (block: TxBlock) => void) => {
        const obs = this.#subject.on((msg) => {
          if (msg.type === MTypeTab.NEW_BLOCK) {
            cb(msg.payload.block);
          }
        });

        return {
          unsubscribe: () => obs()
        };
      }
    };
  }

  public observableNetwork() {
    assert(this.isEnable, 'ERROR_MSGS.DISABLED');
    assert(this.isConnect, 'ERROR_MSGS.CONNECT');

    return {
      subscribe: (cb: (net: string) => void) => {
        const obs = this.#subject.on((msg) => {
          switch (msg.type) {
            case MTypeTab.GET_WALLET_DATA:
              cb(msg.payload.netwrok);
              break;
            case MTypeTab.NETWORK_CHANGED:
              cb(msg.payload.netwrok);
              break;
            default:
              break;
          }
        });

        return {
          unsubscribe: () => obs()
        };
      }
    };
  }

  /**
   * @deprecated
   */
  public observableTransaction(...txns: string[]) {
    console.warn('this method is deprecated and will rework');
    assert(this.isEnable, 'ERROR_MSGS.DISABLED');
    assert(this.isConnect, 'ERROR_MSGS.CONNECT');

    if (txns && txns.length !== 0) {
      this.addTransactionsQueue(...txns);
    }

    return {
      subscribe: (cb: (tx: string) => void) => {
        const obs = this.#subject.on((msg) => {
          if (msg.type !== MTypeTab.NEW_BLOCK) return;
          const block = msg.payload.block as TxBlock;

          for (let index = 0; index < block.TxHashes.length; index++) {
            const elements = block.TxHashes[index];
            for (let i = 0; i < elements.length; i++) {
              const hash = elements[i];
              if (this.txns.has(hash)) {
                cb(hash);
                this.txns.delete(hash);
              }
            }
          }
        });

        return {
          unsubscribe: () => obs()
        };
      }
    };
  }

  public addTransactionsQueue(...txns: string[]) {
    console.warn('this method is deprecated and will rework');
    for (let index = 0; index < txns.length; index++) {
      const tx = txns[index];
      this.txns.add(CryptoUtils.toHex(tx));
    }

    return Array.from(this.txns);
  }

  public async sign(arg: Transaction | string): Promise<any> {
    assert(this.isEnable, 'ERROR_MSGS.DISABLED');
    assert(this.isConnect, 'ERROR_MSGS.CONNECT');

    if (TypeOf.isString(arg)) {
      return this.#signMessage(String(arg));
    } else if (arg instanceof Transaction) {
      return this.#signTransaction(arg);
    }

    return Promise.reject(
      new TypeError(`payload 'MUST_BE_OBJECT' or MUST_BE_STRING`)
    );
  }

  public async connect() {
    const type = MTypeTab.CONNECT_APP;
    const recipient = MTypeTabContent.CONTENT;
    const uuid = uuidv4();
    const title = window.document.title;
    const domain = window.document.domain;
    const icon = getFavicon();
    const payload = {
      title,
      domain,
      icon,
      uuid
    };

    new ContentMessage({
      type,
      payload
    }).send(this.#stream, recipient);

    return new Promise((resolve) => {
      const obs = this.#subject.on((msg) => {
        if (msg.type !== MTypeTab.RESPONSE_TO_DAPP) return;
        if (msg.payload.uuid !== uuid) return;

        this.#defaultAccount = msg.payload.account;

        obs();
        return resolve(Boolean(msg.payload.account));
      });
    });
  }

  #subscribe() {
    this.#subject.on((msg) => {
      switch (msg.type) {
        case MTypeTab.ADDRESS_CHANGED:
          this.#defaultAccount = msg.payload.account;
          break;
        case MTypeTab.GET_WALLET_DATA:
          this.#defaultAccount = msg.payload.account;
          this.#http = msg.payload.http;
          this.#net = msg.payload.netwrok;
          this.#isConnect = msg.payload.isConnect;
          this.#isEnable = msg.payload.isEnable;
          break;
        case MTypeTab.LOCK_STAUS:
          this.#isEnable = msg.payload.isEnable;
          this.#defaultAccount = msg.payload.account;
          break;
        case MTypeTab.NETWORK_CHANGED:
          this.#net = msg.payload.netwrok;
          this.#http = msg.payload.node;
          break;
        default:
          break;
      }
    });
  }

  #signMessage(message: string) {}

  #signTransaction(payload: Transaction) {}
}
