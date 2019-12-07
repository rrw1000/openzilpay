/*
 * Project: ZilPay-wallet
 * Author: Rinat(lich666dead)
 * -----
 * Modified By: the developer formerly known as Rinat(lich666dead) at <lich666black@gmail.com>
 * -----
 * Copyright (c) 2019 ZilPay
 */
import {
  LocalStream,
  SecureMessage,
  MTypeSecure
} from 'lib/stream'

export class NonSecureStream {

  constructor(secureStream) {
    this.secureStream = secureStream
    this._watchTabMessaging()
  }

  _watchTabMessaging() {
    LocalStream.watch((request, response) => {
      const message = new SecureMessage(request)

      this._dispenseMessage(response, message)
    })
  }

  _dispenseMessage(sendResponse, message) {
    if (!message) {
      return null
    }

    this._broadcastToSecure(message)

    sendResponse(true)
  }

  _broadcastToSecure(msg) {
    let toSecureMsg = msg.type

    const recipient = MTypeSecure.INJECTED

    new SecureMessage({
      type: toSecureMsg,
      payload: msg.payload
    }).send(this.secureStream, recipient)
  }

}