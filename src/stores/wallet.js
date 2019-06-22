import { MTypesInternal, MTypesAuth } from '../../lib/messages/messageTypes'
import { Message } from '../../lib/messages/messageCall'


export default {
  namespaced: true,
  state: {
    isReady: false,
    isEnable: false,
    wallet: {
      selectedAddress: null,
      identities: []
    }
  },
  mutations: {
    mutateIsReady(state, isReady) {
      state.isReady = isReady;
    },
    mutateIsEnable(state, isEnable) {
      state.isEnable = isEnable;
    },
    mutateWallet(state, wallet) {
      const type = MTypesInternal.CHANGE_ACCOUNT;
      const payload = { wallet };

      new Message({ type, payload }).send();
      
      state.wallet = wallet;
    }
  },
  actions: {
    async newWallet({ commit }, { seed, password }) {
      const type = MTypesAuth.SET_SEED_AND_PWD;
      const payload = { seed, password };
      const wallet = await new Message({ type, payload }).send();
    
      if (wallet.resolve) {
        commit('mutateWallet', wallet.resolve);
      } else {
        throw new Error(wallet.reject);
      }
    },
    async balanceUpdate({ commit }) {
      const result = await Message.signal(
        MTypesInternal.UPDATE_BALANCE
      ).send();
    
      if (result.resolve) {
        commit('mutateWallet', result.resolve);
        return result.resolve;
      } else {
        throw new Error(result.reject);
      }
    },
    async unlockWallet({ commit }, password) {
      const type = MTypesAuth.SET_PASSWORD;
      const payload = { password };
      const status = await new Message({ type, payload }).send();
    
      if (status.resolve) {
        commit('mutateIsEnable', status.resolve);
        return status.resolve;
      } else {
        throw new Error(status.reject);
      }
    },
    async createAccount({ commit }) {
      const result = await Message.signal(MTypesInternal.CREATE_ACCOUNT).send();
    
      if (result.resolve) {
        commit('mutateWallet', result.resolve);
      } else {
        throw new Error(result.reject);
      }
      
      return result.resolve;
    },
    async changeAccountName({ state }, name) {
      const type = MTypesInternal.ACC_CHANGE_NAME;
      const payload = { name };
      const status = await new Message({ type, payload }).send();
    
      if (status.resolve) {
        state.wallet.identities[
          state.wallet.selectedAddress
        ]['name'] = name;
      } else {
        throw new Error(status.reject);
      }
    },
    async importByPrivateKey({ state }, privKey) {
      const result = await new Message({
        type: MTypesAuth.IMPORT_PRIV_KEY,
        payload: { privKey }
      }).send();
    
      if (result.resolve) {
        state.wallet = result.resolve;
        return result.resolve;
      } else if (result.reject) {
        throw new Error(result.reject);
      }
    
      return null;
    },
    async importByHw({ state }, payload) {
      const type = MTypesAuth.IMPORT_BY_HW;
      const result = await new Message({ type, payload }).send();
      
      if (result.resolve) {
        state.wallet = result.resolve;
        return result.resolve;
      } else if (result.reject) {
        throw new Error(result.reject);
      }
    },
    removeAccount({ state, commit }) {
      if (state.wallet.selectedAddress == 0) {
        return null;
      }

      delete state.wallet.identities[
        state.wallet.selectedAddress
      ];

      state.wallet.selectedAddress--;
      state.wallet.identities = state.wallet.identities.filter(el => !!el);
      commit('mutateWallet', state.wallet);
    },
    walletReset({ state, commit }) {
      const firstIndex = 0;
      const firstAccount = state.wallet.identities[firstIndex];
      
      state.wallet.identities = [firstAccount];
      state.wallet.selectedAddress = firstIndex;
      
      commit('mutateWallet', state.wallet);
    },
    logOut({ commit }) {
      Message.signal(MTypesAuth.LOG_OUT).send();
      commit('mutateIsEnable', false);
      window.close();
    },

    initPopup: () => Message.signal(MTypesInternal.INIT).send(),
    randomSeed: () => Message.signal(MTypesInternal.GET_DECRYPT_SEED).send()
  },
  getters: {
  }
};