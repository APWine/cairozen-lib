import { readFileSync } from 'fs';

import test, { beforeEach } from 'ava';
import * as dotenv from 'dotenv';
dotenv.config();
import {
    Account,
    CallData,
    Contract,
    json,
    Provider,
    shortString,
} from 'starknet';
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
    const accountAddress0 =
        '0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a';
    return new Account(cairozen.starknetProvider, accountAddress0, privateKey0);
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
            casm: json.parse(
                readFileSync(
                    './compiled-contract/contracts_CairozenEOA.casm.json'
                ).toString('ascii')
            ),
            contract: json.parse(
                readFileSync(
                    './compiled-contract/contracts_CairozenEOA.sierra.json'
                ).toString('ascii')
            ),
        })
        .then(({ transaction_hash }) =>
            cairozen.starknetProvider.waitForTransaction(transaction_hash)
        );
});

async function deployAccount() {
    const accountAddress = cairozen.getStarknetAccountAddress(
        cairozen.viemWalletClient.account.address
    );
    await faucet(accountAddress);
    const receipt = await cairozen.deployStarknetAccount(
        cairozen.viemWalletClient.account.address
    );
    return { accountAddress, receipt };
}

test.serial('Deploys account on StarkNet', async (t) => {
    const { receipt } = await deployAccount();
    t.assert(receipt.status === 'ACCEPTED_ON_L2');
});

test.serial('Assigns correct Ethereum owner', async (t) => {
    const { accountAddress } = await deployAccount();
    // FIXME:
    t.assert(
        (await cairozen.getAccountEthOwner(accountAddress)) ===
            cairozen.viemWalletClient.account.address
    );
});

test.serial(
    'Executes a basic transaction on StarkNet signed from Ethereum',
    async (t) => {
        const { accountAddress } = await deployAccount();

        // Deploy Counter contract
        const { receipt, counterAddress } = await devAccount
            .declareAndDeploy({
                casm: json.parse(
                    readFileSync(
                        './compiled-contract/contracts_CounterContract.casm.json'
                    ).toString('ascii')
                ),
                contract: json.parse(
                    readFileSync(
                        './compiled-contract/contracts_CounterContract.sierra.json'
                    ).toString('ascii')
                ),
                constructorCalldata: CallData.compile({
                    initial_counter: 0,
                }),
            })
            .then(
                async ({
                    deploy: {
                        transaction_hash,
                        contract_address: counterAddress,
                    },
                }) => {
                    const receipt =
                        await cairozen.starknetProvider.waitForTransaction(
                            transaction_hash
                        );
                    return { receipt, counterAddress };
                }
            );
        t.assert(receipt.status === 'ACCEPTED_ON_L2');

        const counterContract = new Contract(
            json.parse(
                readFileSync(
                    './compiled-contract/contracts_CounterContract.sierra.json'
                ).toString('ascii')
            ).abi,
            counterAddress,
            cairozen.starknetProvider
        );
        t.assert((await counterContract.get_counter()) === 0n);
        await cairozen.signAndExecute(accountAddress, [
            {
                to: counterAddress,
                selector:
                    '0x245f9bea6574169db91599999bf914dd43aebc1e0544bdc96c9f401a52b8768', // increase_counter
                calldata: CallData.compile({
                    amount: 0,
                }),
            },
        ]);
        t.assert((await counterContract.get_counter()) === 1n);
    }
);
