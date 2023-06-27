# cairozen

![Cairozen](/logo.png)

Cairozen Library

## Context

This library aims to simplify the process of interacting with StarkNet contracts through an Ethereum wallet, abstracting away the need for a StarkNet-specific wallet and making the onboarding to L2 easier for new users.

## Example usage

```typescript
import Cairozen from 'cairozen';

const cairozen = new Cairozen({ starknetProvider, viemWalletClient }); // initialize the library with your StarkNet provider and Ethereum wallet

const accountAddress = await cairozen.getStarknetAccountAddress(
    ethereumAddress
); // pre-compute the account address to fund it with gas, either through devnet or the official bridge
await deployStarknetAccount(ethereumAddress);

// once your account is deployed, you can interact using your Ethereum wallet
await cairozen.signAndExecute(accountAddress, [
    {
        to: contractAddress,
        selector: methodSelector,
        calldata: CallData.compile({
            /* ... */
        }),
    },
]);
```

Cairozen takes care of signing the transaction on the provided Ethereum wallet and broadcasting it to StarkNet.

## Run tests

Before running tests, you'll need to start a StarkNet node: `yarn devnet`

You can then run the tests locally: `yarn test`
Or in watch mode: `yarn watch:build` + `yarn watch:test`
