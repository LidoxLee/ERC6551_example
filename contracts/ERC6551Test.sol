// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import "./erc6551/interfaces/IERC6551Registry.sol";

contract ERC6551Test is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeable
{
    // difined some params
    string public baseURI;

    IERC6551Registry erc6551Registry;

    address public erc6551AccountImplementation;
    uint256 public chainId;

    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _tokenIdCounter;

    event MintNFTWallet(
        uint256 tokenId,
        uint256 chainId,
        address thisContract,
        address walletAddress
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _registryAddress,
        address _erc6551AccountImplementation,
        string calldata __baseURI,
        uint256 _chainId
    ) public initializer {
        __ERC721_init("ERC6551Test", "TTT");
        __ERC721Enumerable_init();
        __Pausable_init();
        __Ownable_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();
        erc6551Registry = IERC6551Registry(_registryAddress);
        erc6551AccountImplementation = _erc6551AccountImplementation;
        baseURI = __baseURI;
        chainId = _chainId;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    /// @dev Sets the address of the ERC6551 registry
    function setERC6551Registry(address registry) public onlyOwner {
        erc6551Registry = IERC6551Registry(registry);
    }

    /// @dev Sets the address of the ERC6551 account implementation
    function setERC6551Implementation(
        address _implementation
    ) public onlyOwner {
        erc6551AccountImplementation = _implementation;
    }

    function mintNFTwithWallet(address _to) external {
        uint256 tokenId = _tokenIdCounter.current();
        address nftAccountAddress = erc6551Registry.createAccount(
            erc6551AccountImplementation, // 欲 clone 錢包合約地址
            block.chainid, // 用以驗證 chainId 是否正確，預防跨練攻擊
            address(this), // 該 NFT 合約地址。
            tokenId,
            0,
            abi.encodeWithSignature("initialize()") // initialize() function selector;
        );

        emit MintNFTWallet(
            tokenId,
            block.chainid,
            address(this),
            nftAccountAddress
        );

        safeMint(_to);
    }

    function safeMint(address to) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // The following functions are overrides required by Solidity.

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
