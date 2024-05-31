# OpenZilPay Browser Extension

This is a fork of the last GPL'd ZilPay commit, because I like my source open :-)

ZilPay is a browser wallet for Zilliqa blockchain. Developers can integrate ZilPay into their website to create Decentralised Apps.

## Links

## Getting Started
You can deploy the local version, from source code.

### Build Setup


``` bash
# Install dependencies
$ pnpm i
# Build stuff
$ pnpm run dev
# Install it via "install unpacked" in chrome
```

---

Testing isn't yet supported :-(

---

For production building and deploy.
``` bash
$ pnpm run build
```

## Updating icons

 * Change `assets/logo.*` (you need `.png` and `.webp` versions)
 * Install imagemagick
 * Run `node scripts/scale_icons.js`
 * .. and it will autobuild the scaled icons for you.

## Built With

* [webpack](https://github.com/webpack/webpack)
* [babel](https://github.com/babel/babel)
* [svelte](https://github.com/sveltejs/svelte)

## Authors

* rrw@semiramis.org.uk [rrw1000](https://github.com/rrw1000)
* **Rinat Khasanshin** - *Initial work* - [hicaru](https://github.com/hicaru)

## License

This project is licensed under the GPLv3 (because that was the licence when it was forked).


