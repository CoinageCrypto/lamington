# Lamington
Inspired by the popular Truffle framework and developed in Typescript, Lamington makes smart contract development simple for any level of EOSIO developer.

## Features
The Lamington library includes CLI tools and JavaScript utilities to streamline the smart contract building, testing and deployment pipeline.

* Skill level agnostic
* TypeScript ready
* Containerized development
* Common JavaScript testing frameworks
* Multi-environment support
* Simple CLI commands
* Easily configurable

## Installation
Lamington includes command line tools and JavaScript utilities for EOSIO contract development. If you haven't installed Lamington as a global dependency already, we recommend doing so with;

```
npm install -g lamington
```

This provides CLI commands to build and test contracts, along with helpful commands like boilerplate generation and initialization.

We recommend also installing the framework as a development dependency within your project, in order to take advantage of Lamington's utilities and helper methods.

```
npm install --save-dev lamington
```

## Usage
Lamington is super simple! Whether your migrating from Solidity, or a seasoned EOSIO developer deploying a complex Decentralized Application.

### Building
Compiling your smart contracts with Lamington is as simple as;

```
lamington build
```

Lamington automatically searches for all files with the `.cpp` file extension before batch compiling within a docker container. Compiling within a docker container with locked configuration ensures contracts compile consistently and clean every time.

#### Ignoring Files & Folders
Fortunately we realized that not every `.cpp` file is a build ready contract. So we added an additional ignore file, rightly named `.lamingtonignore`, to configure directories, files and patterns you don't want added to your build process. The `.lamingtonignore` follows the same syntax as a standard `.gitignore`, requiring a line separated list of ignore definitions. We've added the command line method `lamington ignore` to generate a `.lamingtonignore` file with default settings.

#### Specifying Build Contracts
If you'd like to run builds on specific contracts, an additional contract `identifier` can be specified like so;

```
lamington build [identifier]
```

*Replacing the `[identifier]` with your contract name, filename or fullpath.*

### Testing

```
lamington test
```

## Configuration
Lamington ships with a default configuration to make getting started simple and setup free. However, as your project grows, so will the need for additional Lamington configuration. For example, deployment to a testnet or the live network will require environment setup. Additionally, you'll need customize your configuration if you'd like to control Lamington's fine grain settings. Fortunately we've made it easy to get started with a simple boilerplate generation method;

```
lamington init
```

This creates a `.lamingtonrc` file in your current directory. The `.lamingtonrc` file allows you to configure additional settings using JSON syntax.

### Using a Configuration File
* Configuring environments
* keepAlive

## Resources
You can find more information about the Lamington tool-set and join our growing community of developers by visiting any of the following links;

[API Documentation](https://docs.lamington.dev)

[Slack Channel]()

[Official Website](https://lamington.dev)

## Roadmap

### LamingtonJS

### Lamington-React

### Lamington-Angular

## Contributors
*Contribution guide*
[Kevin Brown](https://github.com/thekevinbrown), Creator & Developer
[Mitch Pierias](https://github.com/MitchPierias), Developer

## Supporters
