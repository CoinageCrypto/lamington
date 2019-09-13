<p align="center">
    <img src="https://lamington.io/img/logo.svg" alt="Lamington Logo" width="300"/>
</p>

Inspired by the popular Truffle framework and developed in Typescript, Lamington makes smart contract development simple for any level of EOSIO developer.

[![Build Status](https://travis-ci.org/CoinageCrypto/lamington.svg?branch=master)](https://travis-ci.org/CoinageCrypto/lamington)
[![Supported by Coinage](https://coina.ge/assets/supported-by-coinage-badge.svg)](https://coina.ge)

## Features

The Lamington library includes CLI tools and JavaScript utilities to streamline the smart contract building, testing and deployment pipeline.

- Skill level agnostic
- TypeScript ready
- Containerized development
- Common JavaScript testing frameworks
- Multi-environment support
- Simple CLI commands
- Easily configurable

## Installation

### Prerequisites

Lamington requires Docker and NodeJS to be installed before it can be used.

- Docker: We recommend [installing Docker with the standard installer for your platform](https://www.docker.com/get-started).
- NodeJS: We recommend [installing NodeJS with NVM](https://github.com/creationix/nvm).

### Installing Lamington

Lamington includes command line tools and JavaScript utilities for EOSIO contract development. We recommend installing the framework as a development dependency within your project. This lets you run commands like `lamington test` in your project.

```
$ npm install --save-dev lamington
```

From there you just need to add node scripts to your `package.json` file that trigger `lamington` actions, for example:

```
{
  ...
  "scripts": {
    "build": "lamington build",
    "start": "lamington start eos",
    "stop": "lamington stop eos",
    "test": "lamington test"
  },
  ...
}
```

### Global Installation

If you'd like the convenience of using the `lamington` command without adding it as a project dependency, you can install it on your system globally, just be mindful that this can create trouble if you use `lamington` with multiple projects simultaneously and don't have them all ready for the same version.

To install globally, run:

```
$ npm install -g lamington
```

## Usage

Lamington is super simple! Whether you're migrating from Solidity, or a seasoned EOSIO developer deploying a complex decentralized application (dApp) you'll find yourself right at home in no time.

### Building

Compiling your smart contracts with Lamington is as simple as;

```
$ lamington build
```

Lamington automatically searches for all files with the `.cpp` file extension before batch compiling within a docker container. Compiling within a docker container with locked configuration ensures contracts compile consistently and clean every time.

#### Ignoring Files & Folders

Not every `.cpp` file is a build ready contract. So we added an additional ignore file, rightly named `.lamingtonignore`, to configure directories, files and patterns you don't want added to your build process. The `.lamingtonignore` follows the same syntax as a standard `.gitignore`, requiring a line separated list of ignore definitions. We've added the command line method `lamington ignore` to generate a `.lamingtonignore` file with default settings.

#### Specifying Build Contracts

If you'd like to run builds on specific contracts, an additional contract `identifier` can be specified like so;

```
$ lamington build [identifier]
```

_Replace the `[identifier]` with the relative path to the contract with or without the .cpp extension._

### Testing

Lamington was built with testing in mind. We considered the most commonly used testing libraries like Mocha when developing the Lamington toolset. Running your test suit is as easy as;

```
$ lamington test
```

For a full list of available JavaScript utilities, please [visit the documentation here](https://docs.lamington.io/testing).

### Initialization

Initially setting up a project can be tedious and repetitive, so we've created a simple CLI method to setup a boilerplate EOSIO project with Lamington integration.

```
$ lamington init
```

This creates a `.lamingtonrc` file in your current directory with default Lamington settings.

```
$ lamington init [PROJECT_NAME]
```

Optionally you can provide and additional `PROJECT_NAME` to create a project directory and initialize a boilerplate project within.

## Configuration

Lamington ships with a default configuration to make getting started simple and setup free. However, as your project grows, so will your need for additional Lamington configuration. For example, deployment to a testnet or the live network will require environment setup. Additionally, you'll need customize your configuration if you'd like to control Lamington's fine grained settings. Fortunately we've made a simple tool to get you started, simply run `lamington init` in your project directory to create a default `.lamingtonrc` configuration file.

### Using a Configuration File

The `.lamingtonrc` file allows you to configure additional settings using JSON syntax. We're working on provide allot more settings, like defining multiple environments for each stage of your pipeline.

```
{
  ...
  "keepAlive":true,
  ...
}
```

The `keepAlive` setting prevents Lamington from stopping the EOSIO container between each build, allowing you to develop faster and compile often.

## Resources

You can find more information about the Lamington tool-set and join our growing community of developers by visiting any of the following links;

[Example Project](https://github.com/MitchPierias/Advanced-EOS-Examples)

[API Documentation](https://api.lamington.io)

[Slack Channel](https://forms.gle/yTjNA46oKywaD7FR6)

[Official Website](https://lamington.io)

## Roadmap

### LamingtonJS

Core Lamington front end toolset

### Lamington-React

React context management for LamingtonJS

### Lamington-Angular

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
