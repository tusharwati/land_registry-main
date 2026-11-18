CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phoneNumber VARCHAR(20),
    password VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS lands (
    id VARCHAR(50) PRIMARY KEY,
    location VARCHAR(100) NOT NULL,
    area INT NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    ownerId VARCHAR(50) NOT NULL,
    isForSale BOOLEAN DEFAULT TRUE,
    surveyNumber VARCHAR(50) UNIQUE,
    district VARCHAR(100),
    state VARCHAR(100),
    pinCode VARCHAR(20),
    marketValue DECIMAL(15, 2),
    documentUrl VARCHAR(255),
    photoUrl VARCHAR(255),
    FOREIGN KEY (ownerId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(50) PRIMARY KEY,
    landId VARCHAR(50) NOT NULL,
    buyerId VARCHAR(50) NOT NULL,
    sellerId VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PENDING',
    FOREIGN KEY (landId) REFERENCES lands(id),
    FOREIGN KEY (buyerId) REFERENCES users(id),
    FOREIGN KEY (sellerId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS blocks (
    idx INT PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    data JSON NOT NULL,
    previousHash VARCHAR(100) NOT NULL,
    hash VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    requestId VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    paymentDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    FOREIGN KEY (requestId) REFERENCES requests(id)
);
