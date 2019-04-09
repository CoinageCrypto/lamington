#!/usr/bin/env bash
set -o errexit

# set PATH
PATH="$PATH:/opt/eosio/bin"

filename="$1"
outputPath="$2"
contractName="$3"

# Ensure the output directory exists
mkdir -p "project/.lamington/compiled_contracts/$outputPath"

# compile smart contract to wasm and abi files using EOSIO.CDT (Contract Development Toolkit)
# https://github.com/EOSIO/eosio.cdt
eosio-cpp -abigen "$filename" -o "project/.lamington/compiled_contracts/$outputPath/$contractName.wasm" --contract "$contractName"
