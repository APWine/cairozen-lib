import {
    Account,
    ec,
    hash,
    stark,
    Provider as StarknetProvider,
} from 'starknet';
import { WalletClient as ViemWalletClient } from 'viem';

export default class Cairozen {
    starknetProvider: StarknetProvider;
    viemWalletClient: ViemWalletClient;

    static readonly ACCOUNT_CONTRACT_HASH =
        '0x02980af42d60804966b39d1cb376636870bfdb68fa7ca49028917e6845d27d1d';

    constructor(options: {
        starknetProvider: StarknetProvider;
        viemWalletClient: ViemWalletClient;
    }) {
        this.starknetProvider = options.starknetProvider;
        this.viemWalletClient = options.viemWalletClient;
        this.viemWalletClient;
    }

    public async getStarknetAccountAddress(ethAddress: string) {
        const accountCalldata = stark.compileCalldata({
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
        const starkKeyPair0 = ec.getKeyPair(privateKey0);
        const accountAddress0 =
            '0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a';
        return new Account(
            this.starknetProvider,
            accountAddress0,
            starkKeyPair0
        );
    }

    public async deployStarknetAccount(ethAddress?: string) {
        const account = this.getDeployerAccount();
        const { transaction_hash } = await account.deployAccount({
            classHash: Cairozen.ACCOUNT_CONTRACT_HASH,
            constructorCalldata: stark.compileCalldata({
                ethAddress,
            }),
            addressSalt: ethAddress.toLowerCase(),
        });
        return this.starknetProvider.waitForTransaction(transaction_hash);
    }
}
