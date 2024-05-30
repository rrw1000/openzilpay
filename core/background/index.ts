import { ZIlPayBackground } from 'core/background/wallet/bg-zilpay';
import { startBackground } from './background';

chrome.runtime.onInstalled.addListener(( {reason} ) => {
  // console.log("onInstalled - " + reason);
});

(async function() {
  const core = new ZIlPayBackground();

  await core.sync();
  startBackground(core);
}());
