set -ex

if [ -z "$1" ]; then
    mode="";
    dir="debug"
else
    mode="--release"
    dir="release"
fi

cargo build $mode --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/$dir/corewar.wasm --out-dir web/src/ --no-modules
mv web/src/corewar.js web/public/corewar.js
mv web/src/corewar_bg.wasm web/dist/corewar_bg.wasm
touch web/public/index.html
