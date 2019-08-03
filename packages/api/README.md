# Lamington API

Library of application utilities, providing extended interfaces for EOSIO smart contract and Lamington interaction.

## Usage

```typescript
import {
  assertRowsEqual,
  assertEOSError
} from "@lamington/api";
```

You can now use the Lamington tools within your tests to simplify generic EOSIO integration tests.

```typescript
describe("MyContract", () => {
  context("mytable", () => {
    it("Should contain no rows", async () => {
      const expectedRows = [];
      await assertRowsEqual(MyContract.mytable(), expectedRows);
    });
  });
});
```

## Features

The API library comes with a collection of tools to help simplify your interactions and testing with EOSIO smart contracts. Below is a list of available functions.

### Chain

- untilBlocknumber
- sleep

### Testing

 - assertRowsEqual
 - assertRowsEqualStrict
 - assertRowCount
 - assertEOSError
 - assertEOSException
 - assertMissingAuthority

## Contributors

- [Kevin Brown](https://github.com/thekevinbrown), Creator & Developer
- [Mitch Pierias](https://github.com/MitchPierias), Developer

## Supporters

<p align="center">
    <a href="https://coina.ge"><img src="https://coina.ge/assets/coinage-logo-light.png" alt="Supported by Coinage" width="100"/></a>
</p>
<p align="center">
    This project is proudly supported by <a href="https://coina.ge">Coinage</a>.<br/>
</p>