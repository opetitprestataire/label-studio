# Run Label Studio Locally 

Got two errors during frontend dependencies installation as bellow.

```bash
yarn install --frozen-lockfile

# Problem 1： Your Browserslist data is outdated. Please run npx update-browserslist-db@latest
# Run the following script to update Browserslist data
npx update-browserslist-db@latest

# Problem 2：Error: Can't resolve 'decode-audio.wasm'
# Run the following script to download decode-audio.wasm
yarn add @martel/audio-file-decoder --force

# Then built the frontend project successfully
yarn build
```
