import { readFileSync } from 'fs';

import test, { beforeEach } from 'ava';
import * as dotenv from 'dotenv';
dotenv.config();
import { Account, ec, json, Provider } from 'starknet';
import { createWalletClient, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { goerli } from 'viem/chains';

import Cairozen from '.';

if (!process.env.STARKNET_DEVNET_URL) {
    throw new Error('STARKNET_DEVNET_URL not specified. Check your .env file.');
}

const cairozen = new Cairozen({
    starknetProvider: new Provider({
        sequencer: { baseUrl: process.env.STARKNET_DEVNET_URL },
    }),
    viemWalletClient: createWalletClient({
        chain: goerli,
        account: privateKeyToAccount(generatePrivateKey()),
        transport: http(),
    }),
});

const devAccount = (() => {
    const privateKey0 = '0xe3e70682c2094cac629f6fbed82c07cd';
    const starkKeyPair0 = ec.getKeyPair(privateKey0);
    const accountAddress0 =
        '0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a';
    return new Account(
        cairozen.starknetProvider,
        accountAddress0,
        starkKeyPair0
    );
})();

async function faucet(address: string, amount = 1000000000000000000000) {
    await fetch(`${process.env.STARKNET_DEVNET_URL}/mint`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            address,
            amount,
            lite: true,
        }),
    });
}

beforeEach(async () => {
    await fetch(`${process.env.STARKNET_DEVNET_URL}/restart`, {
        method: 'POST',
    });
    await faucet(cairozen.viemWalletClient.account.address);
    await devAccount
        .declare({
            classHash: Cairozen.ACCOUNT_CONTRACT_HASH,
            contract: json.parse(
                readFileSync('./Account.json').toString('ascii')
            ),
        })
        .then(({ transaction_hash }) =>
            cairozen.starknetProvider.waitForTransaction(transaction_hash)
        );
});

test('Deploys account on StarkNet', async (t) => {
    const accountAddress = await cairozen.getStarknetAccountAddress(
        cairozen.viemWalletClient.account.address
    );
    await faucet(accountAddress);
    const receipt = await cairozen.deployStarknetAccount(
        cairozen.viemWalletClient.account.address
    );
    t.assert(receipt.status === 'ACCEPTED_ON_L2');
});
