#!/usr/bin/env bash
set -o errexit

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
  --max-transaction-time=1000 \
  --http-validate-host=false \
  --plugin eosio::producer_plugin \
  --plugin eosio::producer_api_plugin \
  --plugin eosio::chain_api_plugin \
  --plugin eosio::http_plugin \
  --http-server-address=0.0.0.0:8888 \
  --access-control-allow-origin=* \
  --contracts-console \
  --verbose-http-errors &
sleep 1s
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

echo "=== lamington: setup wallet: lamington ==="
# First key import is for eosio system account
cleos wallet create -n eosiomain --to-console | tail -1 | sed -e 's/^"//' -e 's/"$//' > eosiomain_wallet_password.txt
cleos wallet import -n eosiomain --private-key $syskey_priv

echo "=== lamington: activate protocol features ==="
curl --silent --output /dev/null -X POST localhost:8888/v1/producer/schedule_protocol_feature_activations \
  -d '{"protocol_features_to_activate": ["0ec7e080177b2c02b278d5088611686b49d739925a92d9bfcacd7fc6b74053bd"]}'
sleep 2s

echo "=== lamington: install bios ==="
contracts_dir=/usr/opt/eosio.contracts/build/contracts
cleos set contract eosio "$contracts_dir/eosio.bios" -p eosio@active
cleos create account eosio eosio.token $syskey_pub
cleos set contract eosio.token "$contracts_dir/eosio.token" -p eosio.token@active
cleos push action eosio.token create '[ "eosio", "1000000000.0000 EOS"]' -p eosio.token@active

# put the background nodeos job to foreground for docker run
fg %1