// React + Web3 Essentials
import { ethers } from 'ethers';
import { useContext, useEffect, useState } from 'react';
import Resolution from "@unstoppabledomains/resolution";

// Internal Components
import { caip10ToWallet } from 'helpers/w2w';
import { AppContext, MessageIPFS } from 'types/chat';
import { Context } from 'modules/chat/ChatModule';
import { intitializeDb } from 'components/chat/w2wChat/w2wIndexeddb';

// Internal Configs
import { appConfig } from '../config';



const getWeb3NameFromIndexDb = async (checksumWallet: string): Promise<any> => {
  const ensFromIndexDB: any = await intitializeDb<string>('Read', 'Wallets', checksumWallet, '', 'ens');
  return ensFromIndexDB;
};

const getEnsName = async (provider: ethers.providers.BaseProvider | any, checksumWallet: string) => {
  let ensName: string = '';
  provider.lookupAddress(checksumWallet).then(async (ens) => {
    if (ens) {
      ensName = ens;
      await intitializeDb<MessageIPFS>('Insert', 'Wallets', checksumWallet, ens, 'ens');
    } else {
      ensName = null;
      await intitializeDb<MessageIPFS>('Insert', 'Wallets', checksumWallet, null, 'ens');
    }
  });
  return ensName;
};

const getUnstoppableName = async (provider: ethers.providers.BaseProvider | any, checksumWallet: string) => {

  // Unstoppable Domains resolution library
  const udResolver = Resolution.fromEthersProvider(provider);

  // attempt reverse resolution on provided address
  let udName = await udResolver.reverse(checksumWallet);
  if (udName) {
    await intitializeDb<MessageIPFS>('Insert', 'Wallets', checksumWallet, udName, 'ens');
  } else {
    udName = null;
    await intitializeDb<MessageIPFS>('Insert', 'Wallets', checksumWallet, null, 'ens');
  }
  return udName;
};


export function useResolveWeb3Name(address?: string, ens?: string):string {
  const [web3Name, setWeb3Name] = useState(null);

  const { currentChat }: AppContext = useContext<AppContext>(Context);

  useEffect(() => {
    (async () => {
      let provider = new ethers.providers.InfuraProvider(appConfig.coreContractChain, appConfig.infuraAPIKey);
      if (address) {
        const walletLowercase = caip10ToWallet(address).toLowerCase();
        const checksumWallet = ethers.utils.getAddress(walletLowercase);
        if (ethers.utils.isAddress(checksumWallet)) {
          try {
            let web3NameFromIndexDb = await getWeb3NameFromIndexDb(checksumWallet);
            if (web3NameFromIndexDb?.body) {
              setWeb3Name(web3NameFromIndexDb?.body);
            } else {
              try {
                let web3Response = await getEnsName(provider, checksumWallet);
                if (!web3Response) {
                  web3Response = await getUnstoppableName(provider, checksumWallet);
                }
                if (web3Response) {
                  setWeb3Name(web3Response);
                }
                else
                {
                  setWeb3Name(null);
                }
              }
              catch (e) {
                console.log('Error in resolving web3 name');
              }
            }
          }
          catch (e) {
            console.log('Error fetching web3 name from indexDB');
          }
        }
      }
      else{
        setWeb3Name(null)
      }
    })();
  }, [currentChat]);

  return web3Name;
}
