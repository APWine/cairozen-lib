import { readFileSync } from 'fs';

import {
    Account,
    CallData,
    Contract,
    hash,
    json,
    Provider as StarknetProvider,
} from 'starknet';
import { WalletClient as ViemWalletClient } from 'viem';

type Call = {
    to: string;
    selector: string;
    calldata: ReturnType<typeof CallData.compile>;
};

export default class Cairozen {
    starknetProvider: StarknetProvider;
    viemWalletClient: ViemWalletClient;

    accountContracts: { [accountAddress: string]: Contract } = {};

    static readonly ACCOUNT_CONTRACT_HASH =
        '0x0532084d790fbaf56420366d103428fa0e8b14f6e3a677b6b263583efdb505e8';

    constructor(options: {
        starknetProvider: StarknetProvider;
        viemWalletClient: ViemWalletClient;
    }) {
        this.starknetProvider = options.starknetProvider;
        this.viemWalletClient = options.viemWalletClient;
        this.viemWalletClient;
    }

    private accountContract(accountAddress: string) {
        return new Contract(
            json.parse(
                readFileSync(
                    './compiled-contract/contracts_CairozenEOA.sierra.json'
                ).toString('ascii')
            ).abi,
            accountAddress,
            this.starknetProvider
        );
    }

    public getStarknetAccountAddress(ethAddress: string) {
        const accountCalldata = CallData.compile({
            ethAddress,
        });
        const accountAddress = hash.calculateContractAddressFromHash(
            ethAddress,
            Cairozen.ACCOUNT_CONTRACT_HASH,
            accountCalldata,
            0
        );
        return accountAddress;
    }

    public getDeployerAccount() {
        const privateKey0 = '0xe3e70682c2094cac629f6fbed82c07cd';
        const accountAddress0 =
            '0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a';
        return new Account(this.starknetProvider, accountAddress0, privateKey0);
    }

    public async deployStarknetAccount(ethAddress: string) {
        const account = this.getDeployerAccount();
        const { transaction_hash } = await account.deployAccount({
            classHash: Cairozen.ACCOUNT_CONTRACT_HASH,
            constructorCalldata: CallData.compile({
                ethAddress,
            }),
            addressSalt: ethAddress.toLowerCase(),
        });
        return this.starknetProvider.waitForTransaction(transaction_hash);
    }

    public async getAccountEthOwner(accountAddress: string) {
        // TODO: convert to hex address
        return await this.accountContract(accountAddress).get_eth_address();
    }

    public async signAndExecute(accountAddress: string, calls: Call[]) {
        // TODO: 712 signature
        return await this.accountContract(accountAddress).__execute__(calls);
    }
}
