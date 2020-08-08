#!/usr/bin/env bash
# set -o errexit
set -x

echo "=== lamington: setup blockchain accounts and smart contract ==="

# set PATH
PATH="$PATH:/opt/eosio/bin:/opt/eosio/bin/scripts"

set -m

# Clear the data directory
rm -rf /mnt/dev/data

# start nodeos ( local node of blockchain )
# run it in a background job such that docker run could continue
nodeos -e -p eosio -d /mnt/dev/data \
  --config-dir /mnt/dev/config \
  --genesis-json /mnt/dev/config/genesis.json \
  --max-transaction-time=60 \
  --http-validate-host=false \
  --http-max-response-time-ms=500 \
  --plugin eosio::producer_plugin \
  --plugin eosio::producer_api_plugin \
  --plugin eosio::chain_api_plugin \
  --plugin eosio::http_plugin \
  --plugin eosio::state_history_plugin \
  --disable-replay-opts \
  --trace-history-debug-mode \
  --trace-history \
  --plugin eosio::history_api_plugin \
  --http-server-address=0.0.0.0:8888 \
  --access-control-allow-origin=* \
  --contracts-console \
  --verbose-http-errors &

until $(curl --output /dev/null \
             --silent \
             --head \
             --fail \
             localhost:8888/v1/chain/get_info)
do
  sleep 1s
done

syskey_pub=EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV
syskey_priv=5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3
contracts_dir=/usr/opt/eosio.contracts/build/contracts

echo "=== lamington: setup wallet: lamington ==="
# First key import is for eosio system account
cleos wallet create -n eosiomain --to-console | tail -1 | sed -e 's/^"//' -e 's/"$//' > eosiomain_wallet_password.txt
cleos wallet import -n eosiomain --private-key $syskey_priv

echo "=== lamington: create system accounts ==="
declare -a system_accounts=("bpay" "msig" "names" "ram" "ramfee" "saving" "stake" "token" "vpay" "rex")
sleep 1s
for account in "${system_accounts[@]}"; do
    cleos create account eosio "eosio.$account" $syskey_pub
done

echo "=== lamington: activate protocol features ==="
curl --silent --output /dev/null -X POST localhost:8888/v1/producer/schedule_protocol_feature_activations \
  -d '{"protocol_features_to_activate": ["0ec7e080177b2c02b278d5088611686b49d739925a92d9bfcacd7fc6b74053bd"]}'
sleep 1s

echo "=== lamington: install system contracts ==="

cleos set contract eosio "$contracts_dir/eosio.system" -p eosio@active
sleep 0.5s
cleos set contract eosio "$contracts_dir/eosio.system" -p eosio@active
sleep 0.5s
cleos set contract eosio "$contracts_dir/eosio.system" -p eosio@active
sleep 0.5s

cleos set contract eosio.token "$contracts_dir/eosio.token"
cleos set contract eosio.msig "$contracts_dir/eosio.msig"

echo "=== lamington: create tokens ==="
cleos push action eosio.token create '[ "eosio", "1000000000.0000 EOS"]' -p eosio.token
cleos push action eosio.token issue '["eosio", "100000000.0000 EOS", "memo"]\' -p eosio

echo "=== lamington: init system contract ==="
cleos push action eosio init '[0, "4,EOS"]' -p eosio@active

sleep 2s

cleos push action eosio setpriv '["eosio.msig",1]' -p eosio

# put the background nodeos job to foreground for docker run
fg %1