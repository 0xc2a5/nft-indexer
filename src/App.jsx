import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Image,
  Input,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import Fallback from "./Fallback";
import classes from "./App.module.css";

function App() {
  const [userAddress, setUserAddress] = useState("");
  const [results, setResults] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [queries, setQueries] = useState({});
  const [tokenDataObjects, setTokenDataObjects] = useState([]);
  const [alchemy, setAlchemy] = useState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAlchemy(new Alchemy({
      apiKey: import.meta.env.VITE_ALCHEMY_API_KEY_SEPOLIA,
      network: Network.ETH_SEPOLIA
    }));
  }, []);

  useEffect(() => {
    async function connectWallet() {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      if (address && alchemy) {
        setUserAddress(address);
        await getNFTsForOwner(address);
      }
    }
    connectWallet();
  }, [alchemy]);

  async function handleCachedQuery(address) {
    setUserAddress(address);
    await getNFTsForOwner(address);
  }

  async function getNFTsForOwner(address) {
    const _address = address || userAddress;
    const cachedQuery = queries[_address];

    if (!_address) {
      setHasQueried(false);
      return;
    }
    else if (cachedQuery) {
      setResults(cachedQuery.data);
      setTokenDataObjects(cachedQuery.tokenDataObjects);
      setHasQueried(true);
      return;
    }

    setLoading(true);

    try {
      const data = await alchemy.nft.getNftsForOwner(_address);
      setResults(data);

      const tokenDataPromises = [];
      for (let i = 0; i < data.ownedNfts.length; i++) {
        const tokenData = alchemy.nft.getNftMetadata(
          data.ownedNfts[i].contract.address,
          data.ownedNfts[i].tokenId
        );
        tokenDataPromises.push(tokenData);
      }

      const tokenDataObjects = await Promise.all(tokenDataPromises);

      setQueries(queries => ({
        [_address]: {
          data,
          tokenDataObjects,
        },
        ...queries
      }));
      setTokenDataObjects(tokenDataObjects);
      setHasQueried(true);
    }
    catch (error) {
      console.log(error);
      alert("Failed to check ERC-721 tokens.");
    }
    setLoading(false);
  }
  return (
    <Box w="100vw">
      <Center>
        <Flex
          alignItems={"center"}
          justifyContent="center"
          flexDirection={"column"}
        >
          <Heading mb={0} fontSize={36}>
            NFT Indexer 🖼
          </Heading>
          <Text>
            Plug in an address and this website will return all of its NFTs!
          </Text>
        </Flex>
      </Center>
      <Flex
        w="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent={"center"}
      >
        <Heading mt={42}>Get all the ERC-721 tokens of this address:</Heading>
        <Input
          className={classes.input}
          onChange={(e) => setUserAddress(e.target.value)}
          value={userAddress}
          maxLength={42}
          autoFocus
          color="black"
          w="600px"
          textAlign="center"
          p={4}
          bgColor="white"
          fontSize={24}
        />
        <Button fontSize={20} onClick={() => getNFTsForOwner()} mt={36} bgColor="blue" isDisabled={loading}>
          {loading
            ? "Loading..."
            : "Fetch NFTs"
          }
        </Button>

        <Heading my={36}>Here are your NFTs:</Heading>

        {hasQueried ? (
          <SimpleGrid w={"90vw"} columns={4} spacing={24}>
            {results.ownedNfts.map((e, i) => {
              console.log("image", tokenDataObjects[i]?.rawMetadata?.image);
              return (
                <Flex
                  className={classes.gridItem}
                  flexDir={"column"}
                  color="white"
                  bg="blue"
                  w={"20vw"}
                  key={`${e.id}-${i}`}
                >
                  <Box className={classes.name}>
                    <b>Name:</b>{" "}
                    {tokenDataObjects[i]?.title?.length === 0
                      ? "No Name"
                      : tokenDataObjects[i]?.title}
                  </Box>
                  <Image
                    className={classes.image}
                    fallback={<Fallback />}
                    src={tokenDataObjects[i]?.rawMetadata?.image || ""}
                    onLoad={() => console.log("load")}
                    onError={() => console.log("error")}
                    alt={"Image"}
                  />
                </Flex>
              );
            })}
          </SimpleGrid>
        ) : (
          "Please make a query! The query may take a few seconds..."
        )}

        <Heading my={36}>Recent queries:</Heading>
        <Flex className={classes.history} direction={"column"}>
          {Object.keys(queries).map(address => (
            <a key={address} onClick={() => handleCachedQuery(address)}>{address}</a>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}

export default App;
