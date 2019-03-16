import Crypto from '../../../lib/crypto'


export class AuthGuard {

  get decryptSeed() {
    return this._crypto.decrypt(this.encryptedSeed, this.pwdHash);
  }

  isDecrypt(encryptData, key, salt) {
    const hash = this._crypto.hash(key + salt);
    
    try {
      this._crypto.decrypt(encryptData, hash);
      return true;
    } catch(err) {
      return false;
    }
  }
  
  constructor(password, salt='', encryptedSeed=null) {
    this._crypto = new Crypto();
    this.encryptedSeed = encryptedSeed;

    if (password) {
      this.pwdHash = this._crypto.hash(password + salt);
    }
  }

  encryptSeed(seed) {
    this.encryptedSeed = this._crypto.encrypt(seed, this.pwdHash);
    return this.encryptedSeed;
  }

  encryptObject(object) {
    if (typeof object !== 'object') {
      throw new Error('param value must be object');
    }
    return this._crypto.encrypt(JSON.stringify(object), this.pwdHash);
  }

  decryptObject(encryptJson) {
    if (!encryptJson) {
      return null;
    }
    
    return JSON.parse(
      this._crypto.decrypt(encryptJson, this.pwdHash)
    );
  }

}
