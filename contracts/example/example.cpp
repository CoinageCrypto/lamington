#include <eosio/eosio.hpp>
#include <string>

using namespace eosio;
using namespace std;

class [[eosio::contract("example")]] example : public contract {

public:

    using contract::contract;

    [[eosio::action]] void post(const name author, const string message) {
        // Ensure author is signee
        require_auth(author);
        // Initialize a message table instance
        message_table messages(_self, _self.value);
        // Store the new message for author
        messages.emplace(author, [&](auto &post) {
            post.id = messages.available_primary_key();
            post.body = message;
            post.author = author;
        });
    }
    
private:

    struct [[eosio::table]] MessageStruct {
        uint64_t        id;
        string          body;
        name            author;

        uint64_t primary_key() const { return id; };
    };

    typedef multi_index<"messages"_n, MessageStruct> message_table;
};