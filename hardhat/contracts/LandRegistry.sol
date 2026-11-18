// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LandRegistry {
    struct Land {
        string id;
        string location;
        uint256 area;
        uint256 price;
        string ownerId;
        string documentCid;
        string photoCid;
        bool isRegistered;
        uint256 registeredAt;
        uint256 lastUpdatedAt;
    }

    // Mapping from land ID to Land details
    mapping(string => Land) public lands;
    // List of all registered land IDs
    string[] public landIds;

    // ---------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------
    event LandRegistered(
        string indexed landId,
        string location,
        uint256 area,
        uint256 price,
        string ownerId,
        string documentCid,
        string photoCid,
        uint256 timestamp
    );

    event OwnershipTransferred(
        string indexed landId,
        string fromOwnerId,
        string toOwnerId,
        uint256 price,
        string location,
        uint256 timestamp
    );

    // ---------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------

    /**
     * @dev Ensures the land ID string is not empty.
     */
    modifier validId(string memory _id) {
        require(bytes(_id).length > 0, "Land ID cannot be empty");
        _;
    }

    /**
     * @dev Ensures the land is already registered on-chain.
     */
    modifier onlyRegistered(string memory _id) {
        require(lands[_id].isRegistered, "Land is not registered on chain");
        _;
    }

    // ---------------------------------------------------------------
    // Write Functions
    // ---------------------------------------------------------------

    /**
     * @notice Register a new land parcel on the blockchain.
     * @dev Reverts if the land ID is already registered.
     * @param _id          Unique string ID matching the off-chain DB record
     * @param _location    Human-readable location string
     * @param _area        Land area in sq ft (must be > 0)
     * @param _price       Selling price in INR (whole number, must be > 0)
     * @param _ownerId     Off-chain user ID of the owner
     * @param _documentCid IPFS / simulated CID of the ownership document
     * @param _photoCid    IPFS / simulated CID of the land photograph
     */
    function registerLand(
        string memory _id,
        string memory _location,
        uint256 _area,
        uint256 _price,
        string memory _ownerId,
        string memory _documentCid,
        string memory _photoCid
    ) public validId(_id) {
        require(!lands[_id].isRegistered, "Land with this ID is already registered on chain");
        require(_area > 0, "Area must be greater than zero");
        require(_price > 0, "Price must be greater than zero");
        require(bytes(_ownerId).length > 0, "Owner ID cannot be empty");

        lands[_id] = Land({
            id: _id,
            location: _location,
            area: _area,
            price: _price,
            ownerId: _ownerId,
            documentCid: _documentCid,
            photoCid: _photoCid,
            isRegistered: true,
            registeredAt: block.timestamp,
            lastUpdatedAt: block.timestamp
        });

        landIds.push(_id);

        emit LandRegistered(
            _id,
            _location,
            _area,
            _price,
            _ownerId,
            _documentCid,
            _photoCid,
            block.timestamp
        );
    }

    /**
     * @notice Transfer land ownership to a new owner.
     * @dev Reverts if land is not registered, or owner IDs are empty/identical.
     * @param _id          Land ID to transfer
     * @param _fromOwnerId Current owner's off-chain user ID (for event logging)
     * @param _toOwnerId   New owner's off-chain user ID
     * @param _price       Agreed sale price
     * @param _location    Location string (for event logging)
     */
    function transferOwnership(
        string memory _id,
        string memory _fromOwnerId,
        string memory _toOwnerId,
        uint256 _price,
        string memory _location
    ) public validId(_id) onlyRegistered(_id) {
        require(bytes(_fromOwnerId).length > 0, "From-owner ID cannot be empty");
        require(bytes(_toOwnerId).length > 0, "To-owner ID cannot be empty");
        // Ensure the recorded owner matches the claimed sender (off-chain trust)
        require(
            keccak256(bytes(lands[_id].ownerId)) == keccak256(bytes(_fromOwnerId)),
            "Caller is not the current owner recorded on chain"
        );
        require(
            keccak256(bytes(_fromOwnerId)) != keccak256(bytes(_toOwnerId)),
            "New owner must be different from current owner"
        );

        lands[_id].ownerId = _toOwnerId;
        lands[_id].price = _price;
        lands[_id].lastUpdatedAt = block.timestamp;

        emit OwnershipTransferred(
            _id,
            _fromOwnerId,
            _toOwnerId,
            _price,
            _location,
            block.timestamp
        );
    }

    // ---------------------------------------------------------------
    // Read / View Functions
    // ---------------------------------------------------------------

    /**
 * @notice Get the current state of a land record from EVM storage.
 * @param _id Land ID to query.
 * @return id The land ID.
 * @return location The land location.
 * @return area The land area.
 * @return price The land price.
 * @return ownerId The current owner's ID.
 * @return isRegistered Whether the land is registered.
 * @return registeredAt The registration timestamp.
 * @return lastUpdatedAt The last update timestamp.
 */
    function getLand(string memory _id) public view returns (
        string memory id,
        string memory location,
        uint256 area,
        uint256 price,
        string memory ownerId,
        bool isRegistered,
        uint256 registeredAt,
        uint256 lastUpdatedAt
    ) {
        Land memory l = lands[_id];
        return (
            l.id,
            l.location,
            l.area,
            l.price,
            l.ownerId,
            l.isRegistered,
            l.registeredAt,
            l.lastUpdatedAt
        );
    }

   /**
 * @notice Get the document and photo CIDs for a registered land.
 * @param _id Land ID to query.
 * @return documentCid The IPFS CID of the land document.
 * @return photoCid The IPFS CID of the land photograph.
 */
    function getLandCids(string memory _id)
        public
        view
        onlyRegistered(_id)
        returns (string memory documentCid, string memory photoCid)
    {
        return (lands[_id].documentCid, lands[_id].photoCid);
    }

    /**
     * @notice Return total number of registered land parcels on chain.
     */
    function getLandCount() public view returns (uint256) {
        return landIds.length;
    }

    /**
     * @notice Check whether a land ID is registered on chain.
     * @param _id Land ID to check
     */
    function isLandRegistered(string memory _id) public view returns (bool) {
        return lands[_id].isRegistered;
    }
}
